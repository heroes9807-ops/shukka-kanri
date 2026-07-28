use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .on_menu_event(|app, event| {
      match event.id().as_ref() {
        "export-master" => {
          let _ = app.emit("export-master", ());
        }
        "import-master" => {
          let _ = app.emit("import-master", ());
        }
        "export-csv-all" => {
          let _ = app.emit("export-csv-all", ());
        }
        _ => {}
      }
    })
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let handle = app.handle();

      let app_menu = SubmenuBuilder::new(handle, "shukka-kanri")
        .about_with_text("shukka-kanriについて", None)
        .separator()
        .services_with_text("サービス")
        .separator()
        .hide_with_text("shukka-kanriを隠す")
        .hide_others_with_text("ほかを隠す")
        .show_all_with_text("すべてを表示")
        .separator()
        .quit_with_text("shukka-kanriを終了")
        .build()?;

      let file_menu = SubmenuBuilder::new(handle, "ファイル")
        .close_window_with_text("ウインドウを閉じる")
        .build()?;

      let export_master_item = MenuItemBuilder::with_id("export-master", "回収先・ドライバーを書き出し...")
        .build(handle)?;
      let import_master_item = MenuItemBuilder::with_id("import-master", "回収先・ドライバーを読み込み...")
        .build(handle)?;
      let export_csv_all_item = MenuItemBuilder::with_id("export-csv-all", "CSVを書き出し(全期間)...")
        .build(handle)?;

      let edit_menu = SubmenuBuilder::new(handle, "編集")
        .undo_with_text("取り消す")
        .redo_with_text("やり直す")
        .separator()
        .cut_with_text("カット")
        .copy_with_text("コピー")
        .paste_with_text("ペースト")
        .select_all_with_text("すべてを選択")
        .separator()
        .item(&export_master_item)
        .item(&import_master_item)
        .item(&export_csv_all_item)
        .build()?;

      let view_menu = SubmenuBuilder::new(handle, "表示")
        .fullscreen_with_text("フルスクリーンにする")
        .build()?;

      let window_menu = SubmenuBuilder::new(handle, "ウインドウ")
        .minimize_with_text("しまう")
        .maximize_with_text("拡大/縮小")
        .build()?;

      let help_menu = SubmenuBuilder::new(handle, "ヘルプ").build()?;

      let menu = MenuBuilder::new(handle)
        .items(&[
          &app_menu,
          &file_menu,
          &edit_menu,
          &view_menu,
          &window_menu,
          &help_menu,
        ])
        .build()?;

      app.set_menu(menu)?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
