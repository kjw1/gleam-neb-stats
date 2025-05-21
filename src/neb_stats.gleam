import gleam/javascript/promise
import gleam/option.{type Option, None, Some}
import gleam/string
import lustre
import lustre/attribute.{class, classes, id, type_}
import lustre/effect
import lustre/element
import lustre/element/html.{div, form, input, p, text}
import lustre/event.{on_change}
import pages/report as report_page
import parse

type AppState {
  AppState(report: Option(report_page.PageState), error_message: Option(String))
}

type Msg {
  UploadReport(String)
  ReportRead(String)
  ReportReadFailed(String)
  ReportMsg(report_page.Msg)
}

pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

@external(javascript, "./read_report_ffi.mjs", "readUploadedFile")
fn read_uploaded_file(input_id: String) -> promise.Promise(String)

fn init(_flags) {
  #(AppState(report: None, error_message: None), effect.none())
}

fn update(state, msg: Msg) {
  case msg {
    UploadReport(_filename) -> {
      let read_effect =
        effect.from(fn(dispatch) {
          read_uploaded_file("report_field")
          |> promise.tap(fn(content) { dispatch(ReportRead(content)) })
          Nil
        })
      #(state, read_effect)
    }
    ReportRead(content) -> {
      let next_state = case parse.parse_report(content) {
        Ok(#(report, _input)) ->
          AppState(..state, report: Some(report_page.init(report)))
        Error(msg) -> AppState(..state, error_message: Some(msg))
      }
      #(next_state, effect.none())
    }
    ReportReadFailed(error) -> #(
      AppState(
        ..state,
        error_message: Some(string.concat(["Failed to read report: ", error])),
      ),
      effect.none(),
    )
    ReportMsg(report_msg) -> {
      let report = case state.report {
        Some(report) -> Some(report_page.update(report, report_msg))
        None -> None
      }
      #(AppState(..state, report: report), effect.none())
    }
  }
}

fn view(state: AppState) {
  let content = case state.report {
    None -> upload_form(state.error_message)
    Some(report) -> report_page.view(report) |> element.map(ReportMsg)
  }
  div([class("container is-fluid")], [content])
}

fn upload_form(error_message) {
  let #(has_error, help_text) = case error_message {
    Some(msg) -> #(True, msg)
    None -> #(False, "Upload an after action report xml")
  }
  form([class("box"), on_change(UploadReport)], [
    div([class("field")], [
      div([class("control")], [
        input([
          id("report_field"),
          classes([#("input", True), #("is-danger", has_error)]),
          type_("file"),
        ]),
      ]),
      p([classes([#("help", True), #("is-danger", has_error)])], [
        text(help_text),
      ]),
    ]),
  ])
}
