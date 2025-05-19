import gleam/option.{type Option, None, Some}
import lustre
import lustre/attribute.{class, type_}
import lustre/element/html.{div, form, input, text}
import pages/report

type AppState {
  AppState(report: Option(report.PageState))
}

pub fn main() {
  let app = lustre.simple(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn init(_flags) {
  AppState(report: None)
}

fn update(state, _msg) {
  state
}

fn view(state: AppState) {
  case state.report {
    None -> upload_form()
    Some(report) -> report.view(report)
  }
}

fn upload_form() {
  form([class("box")], [input([class("input"), type_("file")])])
}
