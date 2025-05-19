import gleam/list
import lustre/attribute.{class}
import lustre/element/html.{div, text}
import report_types

pub type PageState {
  PageState(ships: List(report_types.Ship))
}

pub fn init() {
  PageState(ships: [
    report_types.Ship(name: "Potato", class: "Potato"),
    report_types.Ship(name: "Carrot", class: "Carrot"),
    report_types.Ship(name: "Tomato", class: "Tomato"),
    report_types.Ship(name: "Cucumber", class: "Cucumber"),
  ])
}

pub fn view(state: PageState) {
  let ship_cards = state.ships |> list.map(ship_card)
  div([class("box")], ship_cards)
}

fn ship_card(ship: report_types.Ship) {
  div([class("card")], [
    div([class("card-header")], [text(ship.name)]),
    div([class("card-content")], [text(ship.class)]),
  ])
}
