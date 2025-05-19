import data/report.{type Player, type Report, type Ship, type Team}
import gleam/list
import lustre/attribute.{class}
import lustre/element/html.{div, p, text}

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
    div([class("content")], [
      text(team_name),
      ..{ team.players |> list.map(player_box) }
    ]),
  ])
}

fn player_box(player: Player) {
  div([class("box")], [
    div([class("content")], [
      text(player.name),
      ..{ player.ships |> list.map(ship_card) }
    ]),
  ])
}

fn ship_card(ship: Ship) {
  div([class("card")], [
    div([class("card-header")], [
      p([class("card-header-title")], [text(ship.name)]),
    ]),
    div([class("card-content")], [div([class("content")], [text(ship.class)])]),
  ])
}
