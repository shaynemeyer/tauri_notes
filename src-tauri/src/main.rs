// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Menu, Submenu};
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![convert_markdown, open_editor])
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn convert_markdown(text: &str) -> String {
    let html: String = markdown::to_html(text);
    html
}

#[tauri::command]
async fn open_editor(handle: tauri::AppHandle, editor_id: &str) -> Result<(), tauri::Error> {
    let editor_window =
        tauri::WindowBuilder::new(
            &handle,
            editor_id,
            tauri::WindowUrl::App(("editor/".to_string() + editor_id).parse().unwrap()),
        )
        // .menu(Menu::new().add_submenu(Submenu::new(
        //     "File",
        //     Menu::new().add_item(
        //         CustomMenuItem::new("export", "Export file").accelerator("cmdOrControl+E"),
        //     ),
        // )))
        .menu(Menu::new().add_submenu(Submenu::new(
            "File",
            Menu::new().add_item(
                CustomMenuItem::new("export", "Export file").accelerator("cmdOrControl+E"),
            ),
        )))
        .build()
        .unwrap();

    editor_window.set_title("Editor").unwrap();

    Ok(())
}
