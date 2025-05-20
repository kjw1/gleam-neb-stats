import data/report.{
  type AntiShipWeapon, type Player, type Report, type Ship, type Team,
}
import gleam/float
import gleam/int
import gleam/list
import gleam/result
import lustre/attribute.{class}
import lustre/element/html.{br, div, p, text}

pub type PageState {
  PageState(report: Report)
}

pub fn init(report: Report) {
  PageState(report: report)
}

pub fn view(state: PageState) {
  let team_a_box = team_box(state.report.team_a, "Team A")
  let team_b_box = team_box(state.report.team_b, "Team B")
  div([class("box")], [team_a_box, team_b_box])
}

fn team_box(team: Team, team_name: String) {
  div([class("box")], [
    div([], [
      p([class("title")], [text(team_name)]),
      ..{ team.players |> list.map(player_box) }
    ]),
  ])
}

fn player_box(player: Player) {
  let total_damage = total_damage_dealt(player.ships) |> result.unwrap(0.0)
  div([class("box")], [
    div([], [
      p([class("title is-4")], [
        text(
          player.name
          <> " (Total Damage: "
          <> float.to_string(total_damage)
          <> ")",
        ),
      ]),
      ..{ player.ships |> list.map(ship_card) }
    ]),
  ])
}

fn ship_card(ship: Ship) {
  let total_damage = ship_damage_dealt(ship) |> result.unwrap(0.0)
  div([class("card")], [
    div([class("card-header")], [
      p([class("card-header-title")], [text(ship.name)]),
    ]),
    div([class("card-content")], [
      div([class("content")], [
        text(ship.class),
        br([]),
        text("Damage Taken: " <> int.to_string(ship.damage_taken)),
        br([]),
        text("Damage Dealt: " <> float.to_string(total_damage)),
      ]),
      div([class("box")], ship.anti_ship_weapons |> list.map(weapon_card)),
    ]),
  ])
}

fn weapon_card(weapon: AntiShipWeapon) {
  div([class("box")], [
    p([class("title is-5")], [text(weapon.name)]),
    p([], [text("Damage Dealt: " <> float.to_string(weapon.damage_dealt))]),
  ])
}

fn total_damage_dealt(ships: List(Ship)) {
  ships
  |> list.map(fn(ship) {
    case ship_damage_dealt(ship) {
      Ok(damage_dealt) -> damage_dealt
      Error(_) -> 0.0
    }
  })
  |> list.reduce(fn(a, b) { a +. b })
}

fn ship_damage_dealt(ship: Ship) {
  ship.anti_ship_weapons
  |> list.map(fn(w) { w.damage_dealt })
  |> list.reduce(fn(a, b) { a +. b })
}
