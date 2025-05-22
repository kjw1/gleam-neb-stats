import data/report.{
  type AntiShipWeapon, type Craft, type Player, type Report, type Ship,
  type Team, type TeamAOrB, AntiShipCraftMissileDetails, AntiShipWeapon,
  AntiShipWeaponContinuousDetails, AntiShipWeaponGunDetails, Craft, Player,
  Report, Ship, Team, TeamA, TeamB,
}
import gleam/dict.{type Dict}
import gleam/float
import gleam/int
import gleam/option.{type Option, None, Some}
import gleam/result.{try}
import gleam/string
import xmlm.{type Input, type Name, type Tag, ElementStart, Name, Tag}

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
  parse_report_inner(
    ParseReportState(winning_team: None, team_a: None, team_b: None),
    input,
  )
}

type ParseReportState {
  ParseReportState(
    winning_team: Option(TeamAOrB),
    team_a: Option(Team),
    team_b: Option(Team),
  )
}

fn parse_report_inner(parse_state, input) -> Result(#(Report, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "WinningTeam"), _)), next_input)) -> {
      use #(winning_team_string, next_input) <- result.try(parse_string_element(
        None,
        next_input,
      ))
      case winning_team_string {
        "TeamA" ->
          parse_report_inner(
            ParseReportState(..parse_state, winning_team: Some(TeamA)),
            next_input,
          )
        "TeamB" ->
          parse_report_inner(
            ParseReportState(..parse_state, winning_team: Some(TeamB)),
            next_input,
          )
        _ ->
          Error(
            string.concat(["Unexpected winning team: ", winning_team_string]),
          )
      }
    }
    Ok(#(ElementStart(Tag(Name("", "Teams"), _)), next_input)) -> {
      use #(team_a, team_b, next_input) <- result.try(parse_teams(next_input))
      parse_report_inner(
        ParseReportState(
          ..parse_state,
          team_a: Some(team_a),
          team_b: Some(team_b),
        ),
        next_input,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_report_inner(parse_state, next_input_2)
    }

    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseReportState(
          winning_team: Some(winning_team),
          team_a: Some(team_a),
          team_b: Some(team_b),
        ) ->
          Ok(#(
            Report(winning_team: winning_team, team_a: team_a, team_b: team_b),
            next_input,
          ))
        _ -> {
          Error("Missing report data")
        }
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at report: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_report_inner(parse_state, next_input)
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
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_team_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseTeamState(which_team: Some(which_team), players: players) ->
          Ok(#(which_team, Team(players: players), next_input))
        _ -> {
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
  ParsePlayerState(name: Option(String), ships: List(Ship), craft: List(Craft))
}

fn parse_player(input) {
  parse_player_inner(ParsePlayerState(name: None, ships: [], craft: []), input)
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
    Ok(#(ElementStart(Tag(Name("", "Craft"), _)), next_input)) -> {
      use #(craft, next_input_2) <- try(parse_craft(next_input))
      parse_player_inner(
        ParsePlayerState(..parse_state, craft: craft),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_player_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParsePlayerState(name: Some(name), ships: ships, craft: craft) -> {
          Ok(#(Player(name: name, ships: ships, craft: craft), next_input))
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

fn parse_int_element(input) -> Result(#(Int, Input), String) {
  case parse_string_element(None, input) {
    Ok(#(string_value, next_input)) -> {
      use value <- try(result.replace_error(
        int.parse(string_value),
        "Failed to parse float",
      ))
      Ok(#(value, next_input))
    }
    Error(e) -> Error(e)
  }
}

fn parse_float_element(input) -> Result(#(Float, Input), String) {
  case parse_string_element(None, input) {
    Ok(#(string_value, next_input)) -> {
      use value <- try(result.replace_error(
        result.or(
          float.parse(string_value),
          result.then(int.parse(string_value), fn(int_damage) {
            Ok(int.to_float(int_damage))
          }),
        ),
        "Failed to parse float",
      ))
      Ok(#(value, next_input))
    }
    Error(e) -> Error(e)
  }
}

fn parse_craft(input) {
  parse_craft_inner([], input)
}

fn parse_craft_inner(
  craft: List(Craft),
  input: Input,
) -> Result(#(List(Craft), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "CraftBattleReport"), _)), next_input)) -> {
      use #(new_craft, next_input_2) <- try(parse_craft_report(next_input))
      parse_craft_inner([new_craft, ..craft], next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_craft_inner(craft, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(craft, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at craft: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_craft_inner(craft, next_input)
  }
}

type ParseCraftState {
  ParseCraftState(
    name: Option(String),
    class: Option(String),
    carried: Option(Int),
    lost: Option(Int),
    sorties: Option(Int),
    anti_ship_weapons: List(AntiShipWeapon),
  )
}

fn parse_craft_report(input) {
  parse_craft_report_inner(
    ParseCraftState(
      name: None,
      class: None,
      carried: None,
      lost: None,
      sorties: None,
      anti_ship_weapons: [],
    ),
    input,
  )
}

fn parse_craft_report_inner(
  parse_state,
  input,
) -> Result(#(Craft, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "DesignName"), _)), next_input)) -> {
      use #(name, next_input_2) <- try(parse_string_element(None, next_input))
      parse_craft_report_inner(
        ParseCraftState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "FrameName"), _)), next_input)) -> {
      use #(class, next_input) <- try(parse_string_element(None, next_input))
      parse_craft_report_inner(
        ParseCraftState(..parse_state, class: Some(class)),
        next_input,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Carried"), _)), next_input)) -> {
      use #(carried, next_input_2) <- try(parse_int_element(next_input))
      parse_craft_report_inner(
        ParseCraftState(..parse_state, carried: Some(carried)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Lost"), _)), next_input)) -> {
      use #(lost, next_input_2) <- try(parse_int_element(next_input))
      parse_craft_report_inner(
        ParseCraftState(..parse_state, lost: Some(lost)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "SortiesFlown"), _)), next_input)) -> {
      use #(sorties, next_input_2) <- try(parse_int_element(next_input))
      parse_craft_report_inner(
        ParseCraftState(..parse_state, sorties: Some(sorties)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "StrikeReport"), _)), next_input)) -> {
      use #(weapons, next_input) <- try(parse_craft_strike(next_input))
      parse_craft_report_inner(
        ParseCraftState(..parse_state, anti_ship_weapons: weapons),
        next_input,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_craft_report_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseCraftState(
          name: Some(name),
          class: Some(class),
          carried: Some(carried),
          lost: Some(lost),
          sorties: Some(sorties),
          anti_ship_weapons: anti_ship_weapons,
        ) -> {
          Ok(#(
            Craft(
              name: name,
              class: class,
              carried: carried,
              lost: lost,
              sorties: sorties,
              anti_ship_weapons: anti_ship_weapons,
            ),
            next_input,
          ))
        }
        _ -> {
          Error("Missing craft data")
        }
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at craft: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_craft_report_inner(parse_state, next_input)
  }
}

fn parse_craft_strike(input) -> Result(#(List(AntiShipWeapon), Input), String) {
  parse_craft_strike_inner([], input)
}

fn parse_craft_strike_inner(
  craft_weapon_reports: List(AntiShipWeapon),
  input,
) -> Result(#(List(AntiShipWeapon), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "GeneralWeapons"), _)), next_input)) -> {
      use #(weapons, next_input_2) <- try(parse_craft_strike_weapons(next_input))
      parse_craft_strike_inner(weapons, next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_craft_strike_inner(craft_weapon_reports, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) ->
      Ok(#(craft_weapon_reports, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at craft strike: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_craft_strike_inner(craft_weapon_reports, next_input)
  }
}

fn parse_craft_strike_weapons(
  input,
) -> Result(#(List(AntiShipWeapon), Input), String) {
  parse_craft_strike_weapons_inner([], input)
}

fn parse_craft_strike_weapons_inner(
  craft_weapon_reports: List(AntiShipWeapon),
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
      use #(missile, next_input_2) <- try(parse_anti_ship_weapon(next_input))
      parse_craft_strike_inner([missile, ..craft_weapon_reports], next_input_2)
    }
    Ok(#(
      ElementStart(Tag(
        Name("", "WeaponReport"),
        [
          xmlm.Attribute(
            name: Name(
              uri: "http://www.w3.org/2001/XMLSchema-instance",
              local: "type",
            ),
            value: "CraftMissileReport",
          ),
        ],
      )),
      next_input,
    )) -> {
      use #(missile, next_input_2) <- try(parse_anti_ship_craft_missile(
        next_input,
      ))
      parse_craft_strike_inner([missile, ..craft_weapon_reports], next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_craft_strike_inner(craft_weapon_reports, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) ->
      Ok(#(craft_weapon_reports, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at craft strike: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_craft_strike_inner(craft_weapon_reports, next_input)
  }
}

type ParseAntiShipCraftMissileState {
  ParseAntiShipCraftMissileState(
    name: Option(String),
    damage_dealt: Option(Float),
    max_damage_per_round: Option(Int),
    rounds_fired: Option(Int),
    hit: Option(Int),
    miss: Option(Int),
    soft_killed: Option(Int),
    hard_killed: Option(Int),
    sortied: Option(Int),
  )
}

fn parse_anti_ship_craft_missile(input) {
  parse_anti_ship_craft_missile_inner(
    ParseAntiShipCraftMissileState(
      name: None,
      damage_dealt: None,
      max_damage_per_round: None,
      rounds_fired: None,
      hit: None,
      miss: None,
      soft_killed: None,
      hard_killed: None,
      sortied: None,
    ),
    input,
  )
}

fn parse_anti_ship_craft_missile_inner(
  parse_state: ParseAntiShipCraftMissileState,
  input: Input,
) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "Name"), _)), next_input)) -> {
      use #(name, next_input_2) <- try(parse_string_element(None, next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalDamageDone"), _)), next_input)) -> {
      use #(damage, next_input_2) <- try(parse_float_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(
          ..parse_state,
          damage_dealt: Some(damage),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "MaxDamagePerShot"), _)), next_input)) -> {
      use #(max_damage, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(
          ..parse_state,
          max_damage_per_round: Some(max_damage),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "ShotsFired"), _)), next_input)) -> {
      use #(rounds_fired, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(
          ..parse_state,
          rounds_fired: Some(rounds_fired),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "HitCount"), _)), next_input)) -> {
      use #(hits, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(..parse_state, hit: Some(hits)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalSortied"), _)), next_input)) -> {
      use #(sortied, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(..parse_state, sortied: Some(sortied)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Misses"), _)), next_input)) -> {
      use #(miss, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(..parse_state, miss: Some(miss)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Softkills"), _)), next_input)) -> {
      use #(soft_kill, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(
          ..parse_state,
          soft_killed: Some(soft_kill),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Hardkills"), _)), next_input)) -> {
      use #(hard_kill, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(
          ..parse_state,
          hard_killed: Some(hard_kill),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_anti_ship_craft_missile_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseAntiShipCraftMissileState(
          name: Some(name),
          damage_dealt: Some(damage_dealt),
          max_damage_per_round: Some(max_damage_per_round),
          rounds_fired: Some(rounds_fired),
          hit: Some(hit),
          miss: Some(miss),
          soft_killed: Some(soft_killed),
          hard_killed: Some(hard_killed),
          sortied: Some(sortied),
        ) -> {
          Ok(#(
            AntiShipWeapon(
              name: name,
              damage_dealt: damage_dealt,
              max_damage_per_round: max_damage_per_round,
              rounds_fired: rounds_fired,
              hits: hit,
              type_details: AntiShipCraftMissileDetails(
                miss: miss,
                soft_killed: soft_killed,
                hard_killed: hard_killed,
                sortied: sortied,
              ),
            ),
            next_input,
          ))
        }
        _ -> {
          Error("Missing anti-ship craft missile data")
        }
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(
        string.concat(["Unexpected data at anti-ship craft missile: ", data]),
      )
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_anti_ship_craft_missile_inner(parse_state, next_input)
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
    anti_ship_missiles: List(report.Missile),
  )
}

fn parse_ship(input) {
  parse_ship_inner(
    ParseShipState(
      name: None,
      class: None,
      damage_taken: None,
      anti_ship_weapons: [],
      anti_ship_missiles: [],
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
      use #(weapons, next_input) <- try(parse_anti_ship(next_input))
      parse_ship_inner(
        ParseShipState(..parse_state, anti_ship_weapons: weapons),
        next_input,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Strike"), _)), next_input)) -> {
      use #(weapons, next_input) <- try(parse_strike(next_input))
      parse_ship_inner(
        ParseShipState(..parse_state, anti_ship_missiles: weapons),
        next_input,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalDamageReceived"), _)), next_input)) -> {
      use #(damage, next_input_2) <- try(parse_int_element(next_input))
      parse_ship_inner(
        ParseShipState(..parse_state, damage_taken: Some(damage)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
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
          anti_ship_missiles: anti_ship_missiles,
        ) -> {
          Ok(#(
            Ship(
              name: name,
              class: class,
              damage_taken: damage,
              anti_ship_weapons: anti_ship_weapons,
              anti_ship_missiles: anti_ship_missiles,
            ),
            next_input,
          ))
        }
        _ -> {
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
      use #(weapon, next_input_2) <- try(parse_anti_ship_weapon(next_input))
      parse_anti_ship_weapons_inner([weapon, ..anti_ship_weapons], next_input_2)
    }
    Ok(#(
      ElementStart(Tag(
        Name("", "WeaponReport"),
        [
          xmlm.Attribute(
            name: Name(
              uri: "http://www.w3.org/2001/XMLSchema-instance",
              local: "type",
            ),
            value: "ContinuousWeaponReport",
          ),
        ],
      )),
      next_input,
    )) -> {
      use #(weapon, next_input_2) <- try(parse_anti_ship_continuous_weapon(
        next_input,
      ))
      parse_anti_ship_weapons_inner([weapon, ..anti_ship_weapons], next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
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

type ParseAntiShipContinuousWeaponState {
  ParseAntiShipContinuousWeaponState(
    name: Option(String),
    damage_dealt: Option(Float),
    max_damage_per_round: Option(Int),
    rounds_fired: Option(Int),
    hits: Option(Int),
    shot_duration: Option(Float),
    battle_short_shots: Option(Int),
  )
}

fn parse_anti_ship_continuous_weapon(input) {
  parse_anti_ship_continuous_weapon_inner(
    ParseAntiShipContinuousWeaponState(
      name: None,
      damage_dealt: None,
      max_damage_per_round: None,
      rounds_fired: None,
      hits: None,
      shot_duration: None,
      battle_short_shots: None,
    ),
    input,
  )
}

fn parse_anti_ship_continuous_weapon_inner(
  parse_state: ParseAntiShipContinuousWeaponState,
  input: Input,
) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "Name"), _)), next_input)) -> {
      use #(name, next_input_2) <- try(parse_string_element(None, next_input))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalDamageDone"), _)), next_input)) -> {
      use #(damage, next_input_2) <- try(parse_float_element(next_input))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(
          ..parse_state,
          damage_dealt: Some(damage),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "MaxDamagePerShot"), _)), next_input)) -> {
      use #(max_damage, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(
          ..parse_state,
          max_damage_per_round: Some(max_damage),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "ShotsFired"), _)), next_input)) -> {
      use #(rounds_fired, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(
          ..parse_state,
          rounds_fired: Some(rounds_fired),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "HitCount"), _)), next_input)) -> {
      use #(hits, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(..parse_state, hits: Some(hits)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "ShotDuration"), _)), next_input)) -> {
      use #(shot_duration, next_input_2) <- try(parse_float_element(next_input))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(
          ..parse_state,
          shot_duration: Some(shot_duration),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "ShotsFiredOverTimeLimit"), _)), next_input)) -> {
      use #(battle_short_shots, next_input_2) <- try(parse_int_element(
        next_input,
      ))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(
          ..parse_state,
          battle_short_shots: Some(battle_short_shots),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_anti_ship_continuous_weapon_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseAntiShipContinuousWeaponState(
          name: Some(name),
          damage_dealt: Some(damage),
          max_damage_per_round: Some(max_damage),
          rounds_fired: Some(rounds_fired),
          hits: Some(hits),
          shot_duration: Some(shot_duration),
          battle_short_shots: Some(battle_short_shots),
        ) ->
          Ok(#(
            AntiShipWeapon(
              name: name,
              damage_dealt: damage,
              max_damage_per_round: max_damage,
              type_details: AntiShipWeaponContinuousDetails(
                shot_duration: shot_duration,
                battle_short_shots: battle_short_shots,
              ),
              rounds_fired: rounds_fired,
              hits: hits,
            ),
            next_input,
          ))
        _ -> Error("Missing anti ship continuous weapon data")
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(
        string.concat(["Unexpected data at anti ship continuous weapon: ", data]),
      )
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_anti_ship_continuous_weapon_inner(parse_state, next_input)
  }
}

fn anti_ship_field_config() {
  dict.from_list([
    #(Some(Tag(Name("", "Name"), [])), ParseValueString),
    #(Some(Tag(Name("", "TotalDamageDone"), [])), ParseValueFloat),
    #(Some(Tag(Name("", "MaxDamagePerShot"), [])), ParseValueInt),
    #(Some(Tag(Name("", "RoundsCarried"), [])), ParseValueInt),
    #(Some(Tag(Name("", "ShotsFired"), [])), ParseValueInt),
    #(Some(Tag(Name("", "HitCount"), [])), ParseValueInt),
  ])
}

fn anti_ship_weapon_decoder(
  parsed_fields: Dict(Option(Tag), ParsedValue(a)),
) -> Result(AntiShipWeapon, String) {
  case
    dict.get(parsed_fields, Some(Tag(Name("", "Name"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "TotalDamageDone"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "MaxDamagePerShot"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "RoundsCarried"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "ShotsFired"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "HitCount"), [])))
  {
    Ok(ParsedValueString(name)),
      Ok(ParsedValueFloat(damage_dealt)),
      Ok(ParsedValueInt(max_damage_per_round)),
      Ok(ParsedValueInt(rounds_carried)),
      Ok(ParsedValueInt(rounds_fired)),
      Ok(ParsedValueInt(hits))
    -> {
      Ok(AntiShipWeapon(
        name: name,
        damage_dealt: damage_dealt,
        max_damage_per_round: max_damage_per_round,
        type_details: AntiShipWeaponGunDetails(rounds_carried: rounds_carried),
        rounds_fired: rounds_fired,
        hits: hits,
      ))
    }
    _, _, _, _, _, _ -> {
      Error("Missing anti ship weapon data")
    }
  }
}

fn parse_anti_ship_weapon(input) {
  let parse_result = parse_map(anti_ship_field_config(), dict.new(), input)
  case parse_result {
    Ok(#(parsed_fields, next_input)) -> {
      use weapon <- try(anti_ship_weapon_decoder(parsed_fields))
      Ok(#(weapon, next_input))
    }
    Error(e) -> Error(e)
  }
}

fn parse_strike(input) {
  parse_strike_inner([], input)
}

fn parse_strike_inner(
  missiles: List(report.Missile),
  input: Input,
) -> Result(#(List(report.Missile), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "Missiles"), _)), next_input)) -> {
      use #(missiles, next_input_2) <- try(parse_missiles(next_input))
      parse_strike_inner(missiles, next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_strike_inner(missiles, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(missiles, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at strike: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_strike_inner(missiles, next_input)
  }
}

fn parse_missiles(input) {
  let parse_result = parse_map(parse_missiles_field_config(), dict.new(), input)
  case parse_result {
    Ok(#(parsed_missiles, next_input)) -> {
      case
        dict.get(
          parsed_missiles,
          Some(Tag(Name("", "OffensiveMissileReport"), [])),
        )
      {
        Ok(ParsedValueList(missiles)) -> Ok(#(missiles, next_input))
        _ -> {
          Ok(#([], next_input))
        }
      }
    }
    Error(e) -> Error(e)
  }
}

fn parse_missiles_field_config() {
  dict.from_list([
    #(
      Some(Tag(Name("", "OffensiveMissileReport"), [])),
      ParseValueList(
        parse_missile_field_config(),
        ParsedValueDecoder(missiles_child_decoder),
      ),
    ),
  ])
}

fn parse_missile_field_config() {
  dict.from_list([
    #(Some(Tag(Name("", "MissileName"), [])), ParseValueString),
    #(Some(Tag(Name("", "TotalDamageDone"), [])), ParseValueFloat),
    #(Some(Tag(Name("", "TotalCarried"), [])), ParseValueInt),
    #(Some(Tag(Name("", "TotalExpended"), [])), ParseValueInt),
    #(Some(Tag(Name("", "Hits"), [])), ParseValueInt),
    #(Some(Tag(Name("", "Misses"), [])), ParseValueInt),
    #(Some(Tag(Name("", "Softkills"), [])), ParseValueInt),
    #(Some(Tag(Name("", "Hardkills"), [])), ParseValueInt),
  ])
}

fn missiles_child_decoder(tag, parsed_fields) {
  case tag {
    Tag(Name("", "OffensiveMissileReport"), []) -> {
      missile_decoder(parsed_fields)
    }
    Tag(Name(namespace, item_name), _) -> {
      Error("Unknown missile child element " <> namespace <> ":" <> item_name)
    }
  }
}

fn missile_decoder(parsed_fields) {
  case
    dict.get(parsed_fields, Some(Tag(Name("", "MissileName"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "TotalDamageDone"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "TotalCarried"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "TotalExpended"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "Hits"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "Misses"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "Softkills"), []))),
    dict.get(parsed_fields, Some(Tag(Name("", "Hardkills"), [])))
  {
    Ok(ParsedValueString(name)),
      Ok(ParsedValueFloat(damage_dealt)),
      Ok(ParsedValueInt(carried)),
      Ok(ParsedValueInt(expended)),
      Ok(ParsedValueInt(hit)),
      Ok(ParsedValueInt(miss)),
      Ok(ParsedValueInt(soft_killed)),
      Ok(ParsedValueInt(hard_killed))
    ->
      Ok(report.Missile(
        name: name,
        damage_dealt: damage_dealt,
        carried: carried,
        expended: expended,
        hit: hit,
        miss: miss,
        soft_killed: soft_killed,
        hard_killed: hard_killed,
      ))
    _, _, _, _, _, _, _, _ -> Error("Missing missile data")
  }
}

type ParsedValueDecoder(parsed_type) {
  ParsedValueDecoder(
    fn(Tag, Dict(Option(Tag), ParsedValue(parsed_type))) ->
      Result(parsed_type, String),
  )
}

type ParseValue(contained) {
  ParseValueString
  ParseValueInt
  ParseValueFloat
  ParseValueList(
    Dict(Option(Tag), ParseValue(contained)),
    ParsedValueDecoder(contained),
  )
  ParseValueSubElement(
    Dict(Option(Tag), ParseValue(contained)),
    ParsedValueDecoder(contained),
  )
}

type ParsedValue(contained) {
  ParsedValueString(String)
  ParsedValueInt(Int)
  ParsedValueFloat(Float)
  ParsedValueList(List(contained))
  ParsedValueSubElement(contained)
}

fn parse_map(
  field_config: Dict(Option(Tag), ParseValue(contained)),
  parsed_fields: Dict(Option(Tag), ParsedValue(contained)),
  input: Input,
) -> Result(#(Dict(Option(Tag), ParsedValue(contained)), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      case dict.get(field_config, Some(tag)) {
        Ok(ParseValueSubElement(sub_field_config, ParsedValueDecoder(decoder))) -> {
          use #(sub_parsed_fields, next_input_2) <- try(parse_map(
            sub_field_config,
            dict.new(),
            next_input,
          ))
          use new_decoded_value <- try(decoder(tag, sub_parsed_fields))
          let next_parsed_fields =
            dict.insert(
              parsed_fields,
              Some(tag),
              ParsedValueSubElement(new_decoded_value),
            )
          echo next_parsed_fields
          parse_map(field_config, next_parsed_fields, next_input_2)
        }
        Ok(ParseValueList(sub_field_config, ParsedValueDecoder(decoder))) -> {
          use #(sub_parsed_fields, next_input_2) <- try(parse_map(
            sub_field_config,
            dict.new(),
            next_input,
          ))
          use new_decoded_value <- try(decoder(tag, sub_parsed_fields))
          let next_parsed_fields =
            dict.upsert(parsed_fields, Some(tag), fn(maybe_existing_value) {
              case maybe_existing_value {
                Some(ParsedValueList(existing_parsed_fields)) ->
                  ParsedValueList([new_decoded_value, ..existing_parsed_fields])
                Some(_) -> ParsedValueList([new_decoded_value])
                None -> ParsedValueList([new_decoded_value])
              }
            })
          echo next_parsed_fields
          parse_map(field_config, next_parsed_fields, next_input_2)
        }
        Ok(ParseValueString) -> {
          use #(value, next_input_2) <- try(parse_string_element(
            None,
            next_input,
          ))
          let next_parsed_fields =
            dict.insert(parsed_fields, Some(tag), ParsedValueString(value))
          parse_map(field_config, next_parsed_fields, next_input_2)
        }
        Ok(ParseValueInt) -> {
          use #(value, next_input_2) <- try(parse_int_element(next_input))
          let next_parsed_fields =
            dict.insert(parsed_fields, Some(tag), ParsedValueInt(value))
          parse_map(field_config, next_parsed_fields, next_input_2)
        }
        Ok(ParseValueFloat) -> {
          use #(value, next_input_2) <- try(parse_float_element(next_input))
          let next_parsed_fields =
            dict.insert(parsed_fields, Some(tag), ParsedValueFloat(value))
          parse_map(field_config, next_parsed_fields, next_input_2)
        }
        Error(Nil) -> {
          use next_input <- try(skip_tag(next_input))
          parse_map(field_config, parsed_fields, next_input)
        }
      }
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      Ok(#(parsed_fields, next_input))
    }
    Ok(#(xmlm.Data(data), next_input)) -> {
      let next_parsed_fields =
        dict.insert(parsed_fields, None, ParsedValueString(data))
      parse_map(field_config, next_parsed_fields, next_input)
    }

    Ok(#(xmlm.Dtd(_), next_input)) -> {
      parse_map(field_config, parsed_fields, next_input)
    }
  }
}

fn skip_tag(input) {
  skip_tag_inner(input, 0)
}

fn skip_tag_inner(input, depth) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
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
