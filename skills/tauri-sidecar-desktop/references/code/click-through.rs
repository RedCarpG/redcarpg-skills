//! 鼠标穿透：透明区域的点击落到下层窗口，前端报上来的区域可以交互。
//! 改写自一个在用的 Tauri 2 桌宠（见 SKILL.md「来源与维护」）。
//!
//! 接法（main.rs）：
//!   .manage(HitRegions::default())
//!   .invoke_handler(tauri::generate_handler![set_hit_regions, debug_hit_state, ...])
//!   setup 里：spawn_poller(pet_window.clone(), app.state::<HitRegions>().inner().clone());
//! Cargo.toml（Windows）：windows-sys = { version = "0.59", features = ["Win32_Foundation", "Win32_UI_WindowsAndMessaging"] }
//! 别忘了在 build.rs 声明命令、在 capabilities 里给窗口权限。

use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{State, WebviewWindow, WindowEvent};

const POLL_INTERVAL: Duration = Duration::from_millis(33);
/// 每隔这么多拍主动对一次可见、位置、缩放（约半秒），万一漏了窗口事件也能纠正。
const RESYNC_EVERY: u32 = 15;

/// 窗口内的可交互区域。单位是 CSS 像素（逻辑像素），原点在窗口内容区左上角。
#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum HitRegion {
    Rect { x: f64, y: f64, w: f64, h: f64 },
    Ellipse { cx: f64, cy: f64, rx: f64, ry: f64 },
}

impl HitRegion {
    fn contains(&self, px: f64, py: f64) -> bool {
        match *self {
            HitRegion::Rect { x, y, w, h } => px >= x && px < x + w && py >= y && py < y + h,
            HitRegion::Ellipse { cx, cy, rx, ry } => {
                if rx <= 0.0 || ry <= 0.0 {
                    return false;
                }
                let dx = (px - cx) / rx;
                let dy = (py - cy) / ry;
                dx * dx + dy * dy <= 1.0
            }
        }
    }
}

/// `cursor`、`window_origin` 是桌面物理像素，`scale` 是窗口所在显示器的缩放比。
pub fn hit_test(cursor: (f64, f64), window_origin: (i32, i32), scale: f64, regions: &[HitRegion]) -> bool {
    let x = (cursor.0 - f64::from(window_origin.0)) / scale;
    let y = (cursor.1 - f64::from(window_origin.1)) / scale;
    regions.iter().any(|r| r.contains(x, y))
}

#[derive(Default, Clone)]
pub struct HitRegions(Arc<Mutex<Vec<HitRegion>>>);

impl HitRegions {
    fn with<T>(&self, f: impl FnOnce(&[HitRegion]) -> T) -> T {
        f(&self.0.lock().unwrap_or_else(|e| e.into_inner()))
    }
    fn set(&self, regions: Vec<HitRegion>) {
        *self.0.lock().unwrap_or_else(|e| e.into_inner()) = regions;
    }
}

#[tauri::command]
pub fn set_hit_regions(regions: Vec<HitRegion>, state: State<'_, HitRegions>) {
    state.set(regions);
}

/// 轮询线程上次设的穿透：0 还没设过，1 穿透，2 不穿透。给调试面板看。
static IGNORING: AtomicU8 = AtomicU8::new(0);

#[derive(Serialize)]
pub struct HitState {
    /// Rust 手里的区域（真正决定穿透的那份）。
    regions: Vec<HitRegion>,
    ignoring: Option<bool>,
}

/// 调试面板用：和前端算的那份对比，不一样就标红。
#[tauri::command]
pub fn debug_hit_state(state: State<'_, HitRegions>) -> HitState {
    HitState {
        regions: state.with(|r| r.to_vec()),
        ignoring: match IGNORING.load(Ordering::Relaxed) {
            1 => Some(true),
            2 => Some(false),
            _ => None,
        },
    }
}

#[derive(Debug, Clone, Copy)]
struct Geometry {
    origin: (i32, i32),
    scale: f64,
    visible: bool,
}

fn read_geometry(window: &WebviewWindow) -> Option<Geometry> {
    let origin = window.inner_position().ok()?;
    Some(Geometry {
        origin: (origin.x, origin.y),
        scale: window.scale_factor().ok()?,
        visible: window.is_visible().ok()?,
    })
}

pub fn spawn_poller(window: WebviewWindow, regions: HitRegions) {
    let geometry = Arc::new(Mutex::new(read_geometry(&window)));
    {
        // 窗口事件在主线程上来，这时读位置不用再排队
        let geometry = geometry.clone();
        let w = window.clone();
        window.on_window_event(move |event| {
            if matches!(event, WindowEvent::Moved(_) | WindowEvent::ScaleFactorChanged { .. }) {
                if let Some(g) = read_geometry(&w) {
                    *geometry.lock().unwrap_or_else(|e| e.into_inner()) = Some(g);
                }
            }
        });
    }
    std::thread::spawn(move || {
        // None：还没设置过。前端报区域之前，整个窗口都是穿透的。
        let mut ignoring: Option<bool> = None;
        let mut tick: u32 = 0;
        loop {
            std::thread::sleep(POLL_INTERVAL);
            tick = tick.wrapping_add(1);
            if tick % RESYNC_EVERY == 0 {
                let fresh = read_geometry(&window);
                *geometry.lock().unwrap_or_else(|e| e.into_inner()) = fresh;
            }
            let Some(g) = *geometry.lock().unwrap_or_else(|e| e.into_inner()) else { continue };
            if !g.visible {
                continue;
            }
            let Some(cursor) = cursor_position(&window) else { continue };
            let ignore = !regions.with(|r| hit_test(cursor, g.origin, g.scale, r));
            if ignoring != Some(ignore) && window.set_ignore_cursor_events(ignore).is_ok() {
                ignoring = Some(ignore);
                IGNORING.store(if ignore { 1 } else { 2 }, Ordering::Relaxed);
            }
        }
    });
}

/// 光标在桌面上的位置（物理像素）。Windows 上直接问系统，不经过主线程。
#[cfg(windows)]
fn cursor_position(_window: &WebviewWindow) -> Option<(f64, f64)> {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut p = POINT { x: 0, y: 0 };
    // SAFETY: p 是本函数里的局部变量
    let ok = unsafe { GetCursorPos(&mut p) } != 0;
    ok.then_some((f64::from(p.x), f64::from(p.y)))
}

/// 别的系统：用 Tauri 的接口（会经过主线程，慢一点）。
#[cfg(not(windows))]
fn cursor_position(window: &WebviewWindow) -> Option<(f64, f64)> {
    let p = window.cursor_position().ok()?;
    Some((p.x, p.y))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hit_test_scales_and_offsets() {
        let regions = [HitRegion::Rect { x: 10.0, y: 10.0, w: 20.0, h: 20.0 }];
        // 窗口在 (100, 100)，缩放 1.5：光标 (100 + 15*1.5, 100 + 15*1.5) 落在 (15, 15)
        assert!(hit_test((122.5, 122.5), (100, 100), 1.5, &regions));
        assert!(!hit_test((100.0, 100.0), (100, 100), 1.5, &regions));
    }
}
