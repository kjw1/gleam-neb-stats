import data/report.{dummy_report}
import gleam/option.{type Option, None, Some}
import lustre
import lustre/attribute.{class, type_}
import lustre/element/html.{div, form, input, text}
import lustre/event.{on_change}
import pages/report as report_page

type AppState {
  AppState(report: Option(report_page.PageState))
}

type Msg {
  UploadReport(String)
}

pub fn main() {
  let app = lustre.simple(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn init(_flags) {
  AppState(report: None)
}

fn update(state, msg: Msg) {
  case msg {
    UploadReport(content) ->
      AppState(..state, report: Some(report_page.init(dummy_report())))
  }
}

fn view(state: AppState) {
  case state.report {
    None -> upload_form()
    Some(report) -> report_page.view(report)
  }
}

fn upload_form() {
  form([class("box"), on_change(UploadReport)], [
    input([class("input"), type_("file")]),
  ])
}
