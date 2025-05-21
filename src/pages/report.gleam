import data/report.{
  type AntiShipWeapon, type Missile, type Player, type Report, type Ship,
  type Team, TeamA, TeamB,
}
import gleam/float
import gleam/int
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import lustre/attribute.{class}
import lustre/element/html.{br, div, p, text}
import lustre/event

pub type PageState {
  PageState(report: Report, focus_ship: Option(Ship))
}

pub type Msg {
  FocusShip(Option(Ship))
}

pub fn init(report: Report) {
  PageState(report: report, focus_ship: None)
}

pub fn view(state: PageState) {
  let team_a_box =
    team_box(state.report.team_a, TeamA, state.report.winning_team)
  let team_b_box =
    team_box(state.report.team_b, TeamB, state.report.winning_team)
  let ship_box = case state.focus_ship {
    Some(ship) -> ship_detail(ship)
    None -> div([class("column is-three-fifths")], [])
  }

  div([class("columns")], [ship_box, team_a_box, team_b_box])
}

pub fn update(state: PageState, msg: Msg) {
  case msg {
    FocusShip(ship) -> PageState(..state, focus_ship: ship)
  }
}

fn ship_detail(ship: Ship) {
  let missile_cards = ship.anti_ship_missiles |> list.map(missile_card)
  let gun_cards = ship.anti_ship_weapons |> list.map(weapon_card)
  div([class("column is-three-fifths")], [
    div([], [
      p([class("title is-3")], [text(ship.name)]),
      div([class("content")], [
        text("Class: " <> ship.class),
        br([]),
        text("Damage Taken: " <> int.to_string(ship.damage_taken)),
        br([]),
        text(
          "Antiship Damage Dealt: " <> float.to_string(ship_damage_dealt(ship)),
        ),
        br([]),
        text(
          "Antiship Gun Damage Dealt: "
          <> float.to_string(ship_gun_damage_dealt(ship)),
        ),
        br([]),
        text(
          "Antiship Missile Damage Dealt: "
          <> float.to_string(ship_missile_damage_dealt(ship)),
        ),
      ]),
      ..{ list.append(missile_cards, gun_cards) }
    ]),
  ])
}

fn team_box(team: Team, team_id: report.TeamAOrB, winner: report.TeamAOrB) {
  let team_name = case team_id {
    report.TeamA -> "Team A"
    report.TeamB -> "Team B"
  }
  let team_name_with_winner = case winner == team_id {
    True -> team_name <> " (Winner)"
    False -> team_name
  }
  div([class("column is-one-fifth")], [
    div([], [
      p([class("title is-3")], [text(team_name_with_winner)]),
      ..{ team.players |> list.map(player_box) }
    ]),
  ])
}

fn player_box(player: Player) {
  let total_damage = total_damage_dealt(player.ships)
  div([class("box")], [
    div([], [
      p([class("title is-5")], [
        text(
          player.name
          <> " (Dealt: "
          <> float.to_string(total_damage)
          <> " Taken: "
          <> int.to_string(total_damage_taken(player.ships))
          <> ")",
        ),
      ]),
      ..{ player.ships |> list.map(ship_card) }
    ]),
  ])
}

fn ship_card(ship: Ship) {
  let damage_dealt = ship_damage_dealt(ship)
  div([event.on_click(FocusShip(Some(ship))), class("card")], [
    div([class("card-header")], [
      p([class("card-header-title")], [text(ship.name)]),
    ]),
    div([class("card-content")], [
      div([class("content")], [
        text(ship.class),
        br([]),
        text("Damage Taken: " <> int.to_string(ship.damage_taken)),
        br([]),
        text("Antiship Damage Dealt: " <> float.to_string(damage_dealt)),
      ]),
    ]),
  ])
}

fn weapon_card(weapon: AntiShipWeapon) {
  let damage_string =
    weapon.damage_dealt |> float.to_precision(2) |> float.to_string
  div([class("box")], [
    p([class("title is-5")], [text(weapon.name)]),
    p([], [text("Damage Dealt: " <> damage_string)]),
  ])
}

fn missile_card(missile: Missile) {
  let damage_string =
    missile.damage_dealt |> float.to_precision(2) |> float.to_string
  div([class("box")], [
    p([class("title is-5")], [text(missile.name)]),
    div([class("content")], [
      p([], [
        text("Damage Dealt: " <> damage_string),
        br([]),
        text("Carried: " <> int.to_string(missile.carried)),
        br([]),
        text("Expended: " <> int.to_string(missile.expended)),
        br([]),
        text("Hit: " <> int.to_string(missile.hit)),
        br([]),
        text("Miss: " <> int.to_string(missile.miss)),
        br([]),
        text("Soft Kills: " <> int.to_string(missile.soft_killed)),
        br([]),
        text("Hard Kills: " <> int.to_string(missile.hard_killed)),
      ]),
    ]),
  ])
}

fn total_damage_dealt(ships: List(Ship)) {
  ships
  |> list.map(ship_damage_dealt)
  |> list.reduce(fn(a, b) { a +. b })
  |> result.unwrap(0.0)
  |> float.to_precision(2)
}

fn total_damage_taken(ships: List(Ship)) {
  ships
  |> list.map(fn(ship) { ship.damage_taken })
  |> list.reduce(fn(a, b) { a + b })
  |> result.unwrap(0)
}

fn ship_missile_damage_dealt(ship: Ship) {
  ship.anti_ship_missiles
  |> list.map(fn(m) { m.damage_dealt })
  |> list.reduce(fn(a, b) { a +. b })
  |> result.unwrap(0.0)
  |> float.to_precision(2)
}

fn ship_gun_damage_dealt(ship: Ship) {
  ship.anti_ship_weapons
  |> list.map(fn(w) { w.damage_dealt })
  |> list.reduce(fn(a, b) { a +. b })
  |> result.unwrap(0.0)
  |> float.to_precision(2)
}

fn ship_damage_dealt(ship: Ship) {
  ship_missile_damage_dealt(ship) +. ship_gun_damage_dealt(ship)
}
