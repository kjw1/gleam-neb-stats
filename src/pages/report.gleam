import data/report.{type Ship, Ship}
import gleam/list
import lustre/attribute.{class}
import lustre/element/html.{div, p, text}

pub type PageState {
  PageState(ships: List(Ship))
}

pub fn init() {
  PageState(ships: [
    Ship(name: "Potato", class: "Potato"),
    Ship(name: "Carrot", class: "Carrot"),
    Ship(name: "Tomato", class: "Tomato"),
    Ship(name: "Cucumber", class: "Cucumber"),
  ])
}

pub fn view(state: PageState) {
  let ship_cards = state.ships |> list.map(ship_card)
  div([class("box")], ship_cards)
}

fn ship_card(ship: Ship) {
  div([class("card")], [
    div([class("card-header")], [
      p([class("card-header-title")], [text(ship.name)]),
    ]),
    div([class("card-content")], [div([class("content")], [text(ship.class)])]),
  ])
}
