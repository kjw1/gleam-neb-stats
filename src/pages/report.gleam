import data/report.{
  type Craft, type Missile, type Player, type Report, type Ship, type Team,
  type Weapon, CraftMissileDetails, GunDetails, TeamA, TeamB,
}
import gleam/float
import gleam/int
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import lustre/attribute.{class}
import lustre/element/html.{br, div, h4, h5, h6, p, text}
import lustre/event

pub type DetailFocus {
  ShipDetail(Ship)
  CraftDetail(Craft)
}

pub type PageState {
  PageState(report: Report, detail_focus: Option(DetailFocus))
}

pub type Msg {
  FocusShip(Ship)
  FocusCraft(Craft)
}

pub fn init(report: Report) {
  PageState(report: report, detail_focus: None)
}

pub fn view(state: PageState) {
  let team_a_box =
    team_box(state.report.team_a, TeamA, state.report.winning_team)
  let team_b_box =
    team_box(state.report.team_b, TeamB, state.report.winning_team)
  let ship_box = case state.detail_focus {
    Some(ShipDetail(ship)) -> ship_detail(ship)
    Some(CraftDetail(craft)) -> craft_detail(craft)
    None -> div([class("column is-three-fifths")], [])
  }

  div([class("columns")], [ship_box, team_a_box, team_b_box])
}

pub fn update(state: PageState, msg: Msg) {
  case msg {
    FocusShip(ship) -> PageState(..state, detail_focus: Some(ShipDetail(ship)))
    FocusCraft(craft) ->
      PageState(..state, detail_focus: Some(CraftDetail(craft)))
  }
}

fn craft_detail(craft: Craft) {
  let weapon_cards = craft.anti_ship_weapons |> list.map(weapon_card)
  let weapon_grid =
    div([class("fixed-grid has-4-cols")], [div([class("grid")], weapon_cards)])
  div([class("column is-three-fifths")], [
    div([], [
      p([class("title is-3")], [text(craft.name)]),
      div([class("content")], [
        text("Class: " <> craft.class),
        br([]),
        text("Damage Dealt: " <> float.to_string(craft_damage_dealt(craft))),
        br([]),
        text("Carried: " <> int.to_string(craft.carried)),
        br([]),
        text("Lost: " <> int.to_string(craft.lost)),
        br([]),
        text("Sorties: " <> int.to_string(craft.sorties)),
        br([]),
        weapon_grid,
      ]),
    ]),
  ])
}

fn ship_detail(ship: Ship) {
  let missile_cards = ship.anti_ship_missiles |> list.map(missile_card)
  let missile_grid =
    div([class("fixed-grid has-4-cols")], [div([class("grid")], missile_cards)])
  let gun_cards = ship.anti_ship_weapons |> list.map(weapon_card)
  let gun_grid =
    div([class("fixed-grid has-4-cols")], [div([class("grid")], gun_cards)])
  let defensive_weapon_cards =
    ship.defensive_weapons |> list.map(defensive_weapon_card)
  let defensive_weapon_grid =
    div([class("fixed-grid has-4-cols")], [
      div([class("grid")], defensive_weapon_cards),
    ])
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
      h4([class("title is-4")], [text("Guns")]),
      gun_grid,
      h4([class("title is-4")], [text("Missiles")]),
      missile_grid,
      h4([class("title is-4")], [text("Defensive Weapons")]),
      defensive_weapon_grid,
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
  let craft_cards = player.craft |> list.map(craft_card)
  let ship_cards = player.ships |> list.map(ship_card)
  let cards = list.append(ship_cards, craft_cards)
  div([class("box")], [
    div([], [
      h5([class("title is-5")], [text(player.name)]),
      h6([class("subtitle is-6")], [
        text(
          " (Dealt: "
          <> float.to_string(total_damage)
          <> " Taken: "
          <> int.to_string(total_damage_taken(player.ships))
          <> ")",
        ),
      ]),
      ..cards
    ]),
  ])
}

fn ship_card(ship: Ship) {
  let damage_dealt = ship_damage_dealt(ship)
  div([event.on_click(FocusShip(ship)), class("card")], [
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

fn craft_card(craft: Craft) {
  let damage_dealt = craft_damage_dealt(craft)
  div([event.on_click(FocusCraft(craft)), class("card")], [
    div([class("card-header")], [
      p([class("card-header-title")], [text(craft.name)]),
    ]),
    div([class("card-content")], [
      div([class("content")], [
        text(craft.class),
        br([]),
        text("Damage Dealt: " <> float.to_string(damage_dealt)),
        br([]),
        text("Carried: " <> int.to_string(craft.carried)),
        br([]),
        text("Lost: " <> int.to_string(craft.lost)),
        br([]),
        text("Sorties: " <> int.to_string(craft.sorties)),
      ]),
    ]),
  ])
}

fn weapon_card(weapon: Weapon) {
  case weapon.type_details {
    GunDetails(rounds_carried: rounds_carried) ->
      gun_card(weapon, rounds_carried)
    report.ContinuousDetails(
      shot_duration: shot_duration,
      battle_short_shots: battle_short_shots,
    ) -> continuous_card(weapon, shot_duration, battle_short_shots)
    CraftMissileDetails(sortied: _, miss: _, soft_killed: _, hard_killed: _) ->
      div([], [])
  }
}

fn defensive_weapon_card(weapon: report.DefensiveWeapon) {
  let accuracy =
    { int.to_float(weapon.weapon.hits) /. int.to_float(weapon.weapon.fired) }
    |> float.to_precision(2)
    |> float.to_string
  div([class("cell")], [
    p([class("title is-5")], [text(weapon.weapon.name)]),
    p([], [
      text("Count: " <> int.to_string(weapon.count)),
      br([]),
      text("Rounds Fired: " <> int.to_string(weapon.weapon.fired)),
      br([]),
      text("Hits: " <> int.to_string(weapon.weapon.hits)),
      br([]),
      text("Accuracy: " <> accuracy),
      br([]),
      text(
        "Targets Destroyed/Assigned: "
        <> int.to_string(weapon.weapon.targets_destroyed)
        <> "/"
        <> int.to_string(weapon.weapon.targets_assigned),
      ),
    ]),
  ])
}

fn continuous_card(
  weapon: Weapon,
  shot_duration: Float,
  battle_short_shots: Int,
) {
  let damage_string =
    weapon.damage_dealt |> float.to_precision(2) |> float.to_string
  let accuracy =
    { int.to_float(weapon.hits) /. int.to_float(weapon.fired) }
    |> float.to_precision(2)
    |> float.to_string
  let firing_duration = int.to_float(weapon.fired) *. shot_duration
  let firing_duration_string =
    firing_duration
    |> float.to_precision(2)
    |> float.to_string
  let hit_duration = int.to_float(weapon.hits) *. shot_duration
  let hit_duration_string =
    hit_duration
    |> float.to_precision(2)
    |> float.to_string
  let battle_short_duration = int.to_float(battle_short_shots) *. shot_duration
  let battle_short_duration_string =
    battle_short_duration
    |> float.to_precision(2)
    |> float.to_string
  let damage_per_second_fired =
    weapon.damage_dealt /. firing_duration
    |> float.to_precision(2)
    |> float.to_string
  let damage_per_second_hit_string =
    weapon.damage_dealt /. hit_duration
    |> float.to_precision(2)
    |> float.to_string

  let max_damage_per_second =
    weapon.max_damage_per_round /. shot_duration
    |> float.to_precision(2)
    |> float.to_string
  div([class("cell")], [
    p([class("title is-5")], [text(weapon.name)]),
    p([], [
      text("Damage Dealt: " <> damage_string),
      br([]),
      text("Max Damage Per Second: " <> max_damage_per_second),
      br([]),
      text("Time Fired: " <> firing_duration_string),
      br([]),
      text("Time on Target: " <> hit_duration_string),
      br([]),
      text("Battle Short Duration: " <> battle_short_duration_string),
      br([]),
      text("Accuracy: " <> accuracy),
      br([]),
      text("Damage Per Second Fired: " <> damage_per_second_fired),
      br([]),
      text("Damage Per Second Hit: " <> damage_per_second_hit_string),
    ]),
  ])
}

fn gun_card(weapon: Weapon, rounds_carried: Int) {
  let damage_string =
    weapon.damage_dealt |> float.to_precision(2) |> float.to_string
  let accuracy =
    { int.to_float(weapon.hits) /. int.to_float(weapon.fired) }
    |> float.to_precision(2)
    |> float.to_string
  let damage_per_shot =
    weapon.damage_dealt /. int.to_float(weapon.fired)
    |> float.to_precision(2)
    |> float.to_string
  let damage_per_hit =
    weapon.damage_dealt /. int.to_float(weapon.hits)
    |> float.to_precision(2)
    |> float.to_string
  div([class("cell")], [
    p([class("title is-5")], [text(weapon.name)]),
    p([], [
      text("Damage Dealt: " <> damage_string),
      br([]),
      text(
        "Max Damage Per Round: " <> float.to_string(weapon.max_damage_per_round),
      ),
      br([]),
      text("Rounds Carried: " <> int.to_string(rounds_carried)),
      br([]),
      text("Rounds Fired: " <> int.to_string(weapon.fired)),
      br([]),
      text("Hits: " <> int.to_string(weapon.hits)),
      br([]),
      text("Accuracy: " <> accuracy),
      br([]),
      text("Damage Per Shot Fired: " <> damage_per_shot),
      br([]),
      text("Damage Per Hit: " <> damage_per_hit),
    ]),
  ])
}

fn missile_card(missile: Missile) {
  let damage_string =
    missile.damage_dealt |> float.to_precision(2) |> float.to_string
  let damage_per_hit =
    missile.damage_dealt /. int.to_float(missile.hit)
    |> float.to_precision(2)
    |> float.to_string
  div([class("cell")], [
    p([class("title is-5")], [text(missile.name)]),
    div([class("content")], [
      p([], [
        text("Damage Dealt: " <> damage_string),
        br([]),
        text("Damage Per Hit: " <> damage_per_hit),
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

fn craft_damage_dealt(craft: Craft) {
  craft.anti_ship_weapons
  |> list.map(fn(w) { w.damage_dealt })
  |> list.reduce(fn(a, b) { a +. b })
  |> result.unwrap(0.0)
  |> float.to_precision(2)
}

fn ship_damage_dealt(ship: Ship) {
  ship_missile_damage_dealt(ship) +. ship_gun_damage_dealt(ship)
}
