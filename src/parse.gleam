import data/report.{
  type AntiShipWeapon, type Player, type Ship, type Team, AntiShipWeapon, Player,
  Report, Ship, Team,
}
import gleam/float
import gleam/int
import gleam/option.{type Option, None, Some}
import gleam/result.{try}
import gleam/string
import xmlm.{type Input, ElementStart, Name, Tag}

type TeamAOrB {
  TeamA
  TeamB
}

pub fn parse_report(content: String) {
  content
  |> xmlm.from_string()
  |> xmlm.with_stripping(True)
  |> parse_report_xml()
}

fn parse_report_xml(input) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "FullAfterActionReport"), _)), next_input)) -> {
      parse_report_element(next_input)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_report_xml(next_input_2)
    }
    Ok(#(xmlm.ElementEnd, _next_input)) -> Error("Unexpected end of XML")
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at root: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_report_xml(next_input)
  }
}

fn parse_report_element(input) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "Teams"), _)), next_input)) -> {
      use #(team_a, team_b, next_input) <- result.map(parse_teams(next_input))
      #(Report(team_a: team_a, team_b: team_b), next_input)
    }
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_report_element(next_input_2)
    }
    Ok(#(xmlm.ElementEnd, _next_input)) -> Error("Unexpected end of XML")
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at report: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_report_element(next_input)
  }
}

type ParseTeamsState {
  ParseTeamsState(maybe_team_a: Option(Team), maybe_team_b: Option(Team))
}

fn parse_teams(input) -> Result(#(Team, Team, Input), String) {
  parse_teams_inner(
    ParseTeamsState(maybe_team_a: None, maybe_team_b: None),
    input,
  )
}

fn parse_teams_inner(parse_state, input) -> Result(#(Team, Team, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(
      ElementStart(Tag(
        Name("", "TeamReportOfShipBattleReportCraftBattleReport"),
        _,
      )),
      next_input,
    )) -> {
      echo "Parsing team report"
      use #(which_team, team, next_input_2) <- result.try(parse_team(next_input))
      let new_state = case which_team {
        TeamA -> ParseTeamsState(..parse_state, maybe_team_a: Some(team))
        TeamB -> ParseTeamsState(..parse_state, maybe_team_b: Some(team))
      }

      parse_teams_inner(new_state, next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_teams_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseTeamsState(maybe_team_a: Some(team_a), maybe_team_b: Some(team_b)) ->
          Ok(#(team_a, team_b, next_input))
        _ -> {
          echo parse_state
          Error("Missing teams data")
        }
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at teams: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_teams_inner(parse_state, next_input)
  }
}

type ParseTeamState {
  ParseTeamState(which_team: Option(TeamAOrB), players: List(Player))
}

fn parse_team(input) {
  parse_team_inner(ParseTeamState(which_team: None, players: []), input)
}

fn parse_team_inner(
  parse_state,
  input,
) -> Result(#(TeamAOrB, Team, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "TeamID"), _)), next_input)) -> {
      use #(team_id, next_input_2) <- try(parse_team_id(None, next_input))
      parse_team_inner(
        ParseTeamState(..parse_state, which_team: Some(team_id)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Players"), _)), next_input)) -> {
      use #(players, next_input_2) <- try(parse_players(next_input))
      parse_team_inner(
        ParseTeamState(..parse_state, players: players),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_team_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseTeamState(which_team: Some(which_team), players: players) ->
          Ok(#(which_team, Team(players: players), next_input))
        _ -> {
          echo parse_state
          Error("Missing team data")
        }
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at team: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_team_inner(parse_state, next_input)
  }
}

fn parse_team_id(maybe_id, input) -> Result(#(TeamAOrB, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _)), _)) ->
      Error("unexpected nested element for team id")
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case maybe_id {
        Some(which_team) -> Ok(#(which_team, next_input))
        _ -> Error("Missing team id")
      }
    }
    Ok(#(xmlm.Data("TeamA"), next_input)) ->
      parse_team_id(Some(TeamA), next_input)
    Ok(#(xmlm.Data("TeamB"), next_input)) ->
      parse_team_id(Some(TeamB), next_input)
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at team_id: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_team_id(maybe_id, next_input)
  }
}

fn parse_players(input) {
  parse_players_inner([], input)
}

fn parse_players_inner(
  players: List(Player),
  input: Input,
) -> Result(#(List(Player), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(
      ElementStart(Tag(
        Name("", "AARPlayerReportOfShipBattleReportCraftBattleReport"),
        _,
      )),
      next_input,
    )) -> {
      use #(player, next_input_2) <- try(parse_player(next_input))
      parse_players_inner([player, ..players], next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_players_inner(players, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(players, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at team_players: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_players_inner(players, next_input)
  }
}

type ParsePlayerState {
  ParsePlayerState(name: Option(String), ships: List(Ship))
}

fn parse_player(input) {
  parse_player_inner(ParsePlayerState(name: None, ships: []), input)
}

fn parse_player_inner(parse_state, input) -> Result(#(Player, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "PlayerName"), _)), next_input)) -> {
      use #(name, next_input_2) <- try(parse_string_element(None, next_input))
      parse_player_inner(
        ParsePlayerState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Ships"), _)), next_input)) -> {
      use #(ships, next_input_2) <- try(parse_ships(next_input))
      parse_player_inner(
        ParsePlayerState(..parse_state, ships: ships),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_player_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParsePlayerState(name: Some(name), ships: ships) -> {
          echo #("parsed player: ", name)
          Ok(#(Player(name: name, ships: ships), next_input))
        }
        _ -> Error("Missing player data")
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at player: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_player_inner(parse_state, next_input)
  }
}

fn parse_string_element(maybe_name, input) -> Result(#(String, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _)), _)) ->
      Error("unexpected nested element for string element")
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case maybe_name {
        Some(name) -> Ok(#(name, next_input))
        _ -> Error("Missing player name")
      }
    }
    Ok(#(xmlm.Data(name), next_input)) ->
      parse_string_element(Some(name), next_input)
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_string_element(maybe_name, next_input)
  }
}

fn parse_ships(input) {
  parse_ships_inner([], input)
}

fn parse_ships_inner(
  ships: List(Ship),
  input: Input,
) -> Result(#(List(Ship), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "ShipBattleReport"), _)), next_input)) -> {
      use #(ship, next_input_2) <- try(parse_ship(next_input))
      parse_ships_inner([ship, ..ships], next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_ships_inner(ships, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(ships, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at ships: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_ships_inner(ships, next_input)
  }
}

type ParseShipState {
  ParseShipState(
    name: Option(String),
    class: Option(String),
    damage_taken: Option(Int),
    anti_ship_weapons: List(AntiShipWeapon),
  )
}

fn parse_ship(input) {
  parse_ship_inner(
    ParseShipState(
      name: None,
      class: None,
      damage_taken: None,
      anti_ship_weapons: [],
    ),
    input,
  )
}

fn parse_ship_inner(parse_state, input) -> Result(#(Ship, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "ShipName"), _)), next_input)) -> {
      use #(name, next_input_2) <- try(parse_string_element(None, next_input))
      parse_ship_inner(
        ParseShipState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "HullKey"), _)), next_input)) -> {
      use #(class, next_input) <- try(parse_string_element(None, next_input))
      parse_ship_inner(
        ParseShipState(..parse_state, class: Some(class)),
        next_input,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "AntiShip"), _)), next_input)) -> {
      echo "Parsing anti ship"

      use #(weapons, next_input) <- try(parse_anti_ship(next_input))
      parse_ship_inner(
        ParseShipState(..parse_state, anti_ship_weapons: weapons),
        next_input,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalDamageReceived"), _)), next_input)) -> {
      use #(string_damage, next_input_2) <- try(parse_string_element(
        None,
        next_input,
      ))
      use damage <- try(result.replace_error(
        int.parse(string_damage),
        "Failed to parse damage",
      ))
      parse_ship_inner(
        ParseShipState(..parse_state, damage_taken: Some(damage)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_ship_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseShipState(
          name: Some(name),
          class: Some(class),
          damage_taken: Some(damage),
          anti_ship_weapons: anti_ship_weapons,
        ) -> {
          echo #("parsed ship: ", parse_state)
          Ok(#(
            Ship(
              name: name,
              class: class,
              damage_taken: damage,
              anti_ship_weapons: anti_ship_weapons,
            ),
            next_input,
          ))
        }
        _ -> {
          echo #("parse state: ", parse_state)
          Error("Missing ship data")
        }
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at ships: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_ship_inner(parse_state, next_input)
  }
}

fn parse_anti_ship(input) {
  parse_anti_ship_inner([], input)
}

fn parse_anti_ship_inner(
  anti_ship: List(AntiShipWeapon),
  input: Input,
) -> Result(#(List(AntiShipWeapon), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "Weapons"), _)), next_input)) -> {
      echo "parsing weapons"
      use #(weapons, next_input_2) <- try(parse_anti_ship_weapons(next_input))
      parse_anti_ship_inner(weapons, next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_anti_ship_inner(anti_ship, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(anti_ship, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at anti ship: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_anti_ship_inner(anti_ship, next_input)
  }
}

fn parse_anti_ship_weapons(input) {
  parse_anti_ship_weapons_inner([], input)
}

fn parse_anti_ship_weapons_inner(
  anti_ship_weapons: List(AntiShipWeapon),
  input: Input,
) -> Result(#(List(AntiShipWeapon), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(
      ElementStart(Tag(
        Name("", "WeaponReport"),
        [
          xmlm.Attribute(
            name: Name(
              uri: "http://www.w3.org/2001/XMLSchema-instance",
              local: "type",
            ),
            value: "DiscreteWeaponReport",
          ),
        ],
      )),
      next_input,
    )) -> {
      echo "parsing weapon report"
      use #(weapon, next_input_2) <- try(parse_anti_ship_weapon(next_input))
      parse_anti_ship_weapons_inner([weapon, ..anti_ship_weapons], next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      echo #("Skipping tag: ", tag)
      use next_input_2 <- try(skip_tag(next_input))
      parse_anti_ship_weapons_inner(anti_ship_weapons, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(anti_ship_weapons, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at anti ship weapons: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_anti_ship_weapons_inner(anti_ship_weapons, next_input)
  }
}

type ParseAntiShipWeaponState {
  ParseAntiShipWeaponState(name: Option(String), damage_dealt: Option(Float))
}

fn parse_anti_ship_weapon(input) {
  parse_anti_ship_weapon_inner(
    ParseAntiShipWeaponState(name: None, damage_dealt: None),
    input,
  )
}

fn parse_anti_ship_weapon_inner(
  parse_state,
  input,
) -> Result(#(AntiShipWeapon, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "Name"), _)), next_input)) -> {
      use #(name, next_input_2) <- try(parse_string_element(None, next_input))
      parse_anti_ship_weapon_inner(
        ParseAntiShipWeaponState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalDamageDone"), _)), next_input)) -> {
      use #(string_damage, next_input_2) <- try(parse_string_element(
        None,
        next_input,
      ))
      use damage <- try(result.replace_error(
        result.or(
          float.parse(string_damage),
          result.then(int.parse(string_damage), fn(int_damage) {
            Ok(int.to_float(int_damage))
          }),
        ),
        "Failed to parse damage: " <> string_damage,
      ))
      parse_anti_ship_weapon_inner(
        ParseAntiShipWeaponState(..parse_state, damage_dealt: Some(damage)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_anti_ship_weapon_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseAntiShipWeaponState(name: Some(name), damage_dealt: Some(damage)) ->
          Ok(#(AntiShipWeapon(name: name, damage_dealt: damage), next_input))
        _ -> Error("Missing anti ship weapon data")
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at anti ship weapon: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_anti_ship_weapon_inner(parse_state, next_input)
  }
}

fn skip_tag(input) {
  skip_tag_inner(input, 0)
}

fn skip_tag_inner(input, depth) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      //echo #("Skipping sub tag: ", tag)
      skip_tag_inner(next_input, depth + 1)
    }
    Ok(#(xmlm.ElementEnd, next_input)) ->
      case depth {
        0 -> Ok(next_input)
        _ -> skip_tag_inner(next_input, depth - 1)
      }
    Ok(#(_, next_input)) -> skip_tag_inner(next_input, depth)
  }
}
