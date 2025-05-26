import data/report.{
  type Craft, type DefensiveWeapon, type Player, type Report, type Ship,
  type Team, type TeamAOrB, type Weapon, ContinuousDetails, Craft,
  CraftMissileDetails, DefensiveWeapon, GunDetails, Player, Report, Ship, Team,
  TeamA, TeamB, Weapon,
}
import gleam/float
import gleam/int
import gleam/option.{type Option, None, Some}
import gleam/result.{try}
import gleam/string
import xmlm.{type Input, ElementStart, Name, Tag}

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
      case int.parse(string_value) {
        Ok(value) -> Ok(#(value, next_input))
        Error(_) -> {
          Error("Failed to parse int: " <> string_value)
        }
      }
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
    anti_ship_weapons: List(Weapon),
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

fn parse_craft_strike(input) -> Result(#(List(Weapon), Input), String) {
  parse_craft_strike_inner([], input)
}

fn parse_craft_strike_inner(
  craft_weapon_reports: List(Weapon),
  input,
) -> Result(#(List(Weapon), Input), String) {
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

fn parse_craft_strike_weapons(input) -> Result(#(List(Weapon), Input), String) {
  parse_craft_strike_weapons_inner([], input)
}

fn parse_craft_strike_weapons_inner(
  craft_weapon_reports: List(Weapon),
  input: Input,
) -> Result(#(List(Weapon), Input), String) {
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
    max_damage_per_round: Option(Float),
    fired: Option(Int),
    hit: Option(Int),
    miss: Option(Int),
    soft_killed: Option(Int),
    hard_killed: Option(Int),
    sortied: Option(Int),
    targets_assigned: Option(Int),
    targets_destroyed: Option(Int),
  )
}

fn parse_anti_ship_craft_missile(input) {
  parse_anti_ship_craft_missile_inner(
    ParseAntiShipCraftMissileState(
      name: None,
      damage_dealt: None,
      max_damage_per_round: None,
      fired: None,
      hit: None,
      miss: None,
      soft_killed: None,
      hard_killed: None,
      sortied: None,
      targets_assigned: None,
      targets_destroyed: None,
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
      use #(max_damage, next_input_2) <- try(parse_float_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(
          ..parse_state,
          max_damage_per_round: Some(max_damage),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "ShotsFired"), _)), next_input)) -> {
      use #(fired, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_craft_missile_inner(
        ParseAntiShipCraftMissileState(..parse_state, fired: Some(fired)),
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
          fired: Some(fired),
          hit: Some(hit),
          miss: Some(miss),
          soft_killed: Some(soft_killed),
          hard_killed: Some(hard_killed),
          sortied: Some(sortied),
          targets_assigned: Some(targets_assigned),
          targets_destroyed: Some(targets_destroyed),
        ) -> {
          Ok(#(
            Weapon(
              name: name,
              damage_dealt: damage_dealt,
              max_damage_per_round: max_damage_per_round,
              fired: fired,
              hits: hit,
              targets_assigned: targets_assigned,
              targets_destroyed: targets_destroyed,
              type_details: CraftMissileDetails(
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
    anti_ship_weapons: List(Weapon),
    anti_ship_missiles: List(report.Missile),
    defensive_weapons: List(DefensiveWeapon),
    defensive_missiles: List(report.DefensiveMissile),
    decoys: List(report.Decoy),
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
      defensive_weapons: [],
      defensive_missiles: [],
      decoys: [],
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
    Ok(#(ElementStart(Tag(Name("", "Defenses"), [])), next_input)) -> {
      use
        #(
          Defenses(
            defensive_weapons: dw,
            defensive_missiles: dm,
            decoys: decoys,
          ),
          next_input_2,
        )
      <- try(parse_defenses(next_input))
      parse_ship_inner(
        ParseShipState(
          ..parse_state,
          defensive_weapons: dw,
          defensive_missiles: dm,
          decoys: decoys,
        ),
        next_input_2,
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
          defensive_weapons: defensive_weapons,
          defensive_missiles: defensive_missiles,
          decoys: decoys,
        ) -> {
          Ok(#(
            Ship(
              name: name,
              class: class,
              damage_taken: damage,
              anti_ship_weapons: anti_ship_weapons,
              anti_ship_missiles: anti_ship_missiles,
              defensive_weapons: defensive_weapons,
              defensive_missiles: defensive_missiles,
              decoys: decoys,
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

type Defenses {
  Defenses(
    defensive_weapons: List(DefensiveWeapon),
    defensive_missiles: List(report.DefensiveMissile),
    decoys: List(report.Decoy),
  )
}

fn parse_defenses(input) {
  parse_defenses_inner(Defenses([], [], []), input)
}

fn parse_defenses_inner(
  defenses: Defenses,
  input: Input,
) -> Result(#(Defenses, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "WeaponReports"), _)), next_input)) -> {
      use #(weapons, next_input_2) <- try(parse_defensive_weapon_reports(
        next_input,
      ))
      parse_defenses_inner(
        Defenses(..defenses, defensive_weapons: weapons),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "MissileReports"), _)), next_input)) -> {
      use #(missiles, next_input_2) <- try(parse_defensive_missiles(next_input))
      parse_defenses_inner(
        Defenses(..defenses, defensive_missiles: missiles),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "DecoyReports"), _)), next_input)) -> {
      use #(decoys, next_input_2) <- try(parse_decoys(next_input))
      parse_defenses_inner(Defenses(..defenses, decoys: decoys), next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_defenses_inner(defenses, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(defenses, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at defenses: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_defenses_inner(defenses, next_input)
  }
}

fn parse_decoys(input) {
  parse_decoys_inner([], input)
}

type ParseDecoyState {
  ParseDecoyState(
    name: Option(String),
    carried: Option(Int),
    expended: Option(Int),
    seductions: Option(Int),
  )
}

fn parse_decoys_inner(
  decoys: List(report.Decoy),
  input: Input,
) -> Result(#(List(report.Decoy), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "DecoyReport"), _)), next_input)) -> {
      use #(decoy, next_input_2) <- try(parse_decoy(next_input))
      parse_decoys_inner([decoy, ..decoys], next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_decoys_inner(decoys, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(decoys, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at decoys: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_decoys_inner(decoys, next_input)
  }
}

fn parse_decoy(input) {
  parse_decoy_inner(
    ParseDecoyState(name: None, carried: None, expended: None, seductions: None),
    input,
  )
}

fn parse_decoy_inner(
  parse_state: ParseDecoyState,
  input: Input,
) -> Result(#(report.Decoy, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "MissileName"), _)), next_input)) -> {
      use #(name, next_input_2) <- try(parse_string_element(None, next_input))
      parse_decoy_inner(
        ParseDecoyState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalCarried"), _)), next_input)) -> {
      use #(carried, next_input_2) <- try(parse_int_element(next_input))
      parse_decoy_inner(
        ParseDecoyState(..parse_state, carried: Some(carried)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalExpended"), _)), next_input)) -> {
      use #(expended, next_input_2) <- try(parse_int_element(next_input))
      parse_decoy_inner(
        ParseDecoyState(..parse_state, expended: Some(expended)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalSeductions"), _)), next_input)) -> {
      use #(seductions, next_input_2) <- try(parse_int_element(next_input))
      parse_decoy_inner(
        ParseDecoyState(..parse_state, seductions: Some(seductions)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input <- try(skip_tag(next_input))
      parse_decoy_inner(parse_state, next_input)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseDecoyState(
          name: Some(name),
          carried: Some(carried),
          expended: Some(expended),
          seductions: Some(seductions),
        ) -> {
          Ok(#(
            report.Decoy(
              name: name,
              carried: carried,
              expended: expended,
              seductions: seductions,
            ),
            next_input,
          ))
        }
        _ -> {
          Error("Missing decoy data")
        }
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at decoy: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_decoy_inner(parse_state, next_input)
  }
}

type ParseDefensiveMissileState {
  ParseDefensiveMissileState(
    name: Option(String),
    carried: Option(Int),
    expended: Option(Int),
    targets: Option(Int),
    interceptions: Option(Int),
    successes: Option(Int),
  )
}

fn parse_defensive_missiles(input) {
  parse_defensive_missiles_inner([], input)
}

fn parse_defensive_missiles_inner(
  defensive_missiles: List(report.DefensiveMissile),
  input: Input,
) -> Result(#(List(report.DefensiveMissile), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "DefensiveMissileReport"), _)), next_input)) -> {
      use #(missile, next_input_2) <- try(parse_defensive_missile(next_input))
      parse_defensive_missiles_inner(
        [missile, ..defensive_missiles],
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_defensive_missiles_inner(defensive_missiles, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(defensive_missiles, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at defenses: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_defensive_missiles_inner(defensive_missiles, next_input)
  }
}

fn parse_defensive_missile(input) {
  parse_defensive_missile_inner(
    ParseDefensiveMissileState(
      name: None,
      carried: None,
      expended: None,
      targets: None,
      interceptions: None,
      successes: None,
    ),
    input,
  )
}

fn parse_defensive_missile_inner(
  parse_state: ParseDefensiveMissileState,
  input: Input,
) -> Result(#(report.DefensiveMissile, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "MissileName"), _)), next_input)) -> {
      use #(name, next_input_2) <- try(parse_string_element(None, next_input))
      parse_defensive_missile_inner(
        ParseDefensiveMissileState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalCarried"), _)), next_input)) -> {
      use #(carried, next_input_2) <- try(parse_int_element(next_input))
      parse_defensive_missile_inner(
        ParseDefensiveMissileState(..parse_state, carried: Some(carried)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalExpended"), _)), next_input)) -> {
      use #(expended, next_input_2) <- try(parse_int_element(next_input))
      parse_defensive_missile_inner(
        ParseDefensiveMissileState(..parse_state, expended: Some(expended)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalTargets"), _)), next_input)) -> {
      use #(targets, next_input_2) <- try(parse_int_element(next_input))
      parse_defensive_missile_inner(
        ParseDefensiveMissileState(..parse_state, targets: Some(targets)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalInterceptions"), _)), next_input)) -> {
      use #(interceptions, next_input_2) <- try(parse_int_element(next_input))
      parse_defensive_missile_inner(
        ParseDefensiveMissileState(
          ..parse_state,
          interceptions: Some(interceptions),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalSuccesses"), _)), next_input)) -> {
      use #(successes, next_input_2) <- try(parse_int_element(next_input))
      parse_defensive_missile_inner(
        ParseDefensiveMissileState(..parse_state, successes: Some(successes)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_defensive_missile_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseDefensiveMissileState(
          name: Some(name),
          carried: Some(carried),
          expended: Some(expended),
          targets: Some(targets),
          interceptions: Some(interceptions),
          successes: Some(successes),
        ) -> {
          Ok(#(
            report.DefensiveMissile(
              name: name,
              carried: carried,
              expended: expended,
              targets: targets,
              interceptions: interceptions,
              successes: successes,
            ),
            next_input,
          ))
        }
        _ -> {
          echo parse_state
          Error("Missing defensive missile data")
        }
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at defenses: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_defensive_missile_inner(parse_state, next_input)
  }
}

type ParseDefensiveWeaponState {
  ParseDefensiveWeaponState(count: Option(Int), weapon: Option(Weapon))
}

fn parse_defensive_weapon_reports(
  input,
) -> Result(#(List(DefensiveWeapon), Input), String) {
  parse_defensive_weapon_reports_inner([], input)
}

fn parse_defensive_weapon_reports_inner(
  defensive_weapon_reports: List(DefensiveWeapon),
  input: Input,
) -> Result(#(List(DefensiveWeapon), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "DefensiveWeaponReport"), [])), next_input)) -> {
      use #(weapon, next_input_2) <- try(parse_defensive_weapon_report(
        next_input,
      ))
      parse_defensive_weapon_reports_inner(
        [weapon, ..defensive_weapon_reports],
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_defensive_weapon_reports_inner(
        defensive_weapon_reports,
        next_input_2,
      )
    }
    Ok(#(xmlm.ElementEnd, next_input)) ->
      Ok(#(defensive_weapon_reports, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at defenses: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_defensive_weapon_reports_inner(defensive_weapon_reports, next_input)
  }
}

fn parse_defensive_weapon_report(
  input,
) -> Result(#(DefensiveWeapon, Input), String) {
  parse_defensive_weapon_report_inner(
    ParseDefensiveWeaponState(count: None, weapon: None),
    input,
  )
}

fn parse_defensive_weapon_report_inner(
  parse_state,
  input,
) -> Result(#(DefensiveWeapon, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "WeaponCount"), _)), next_input)) -> {
      use #(count, next_input_2) <- try(parse_int_element(next_input))
      parse_defensive_weapon_report_inner(
        ParseDefensiveWeaponState(..parse_state, count: Some(count)),
        next_input_2,
      )
    }
    Ok(#(
      ElementStart(Tag(
        Name("", "Weapon"),
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
      parse_defensive_weapon_report_inner(
        ParseDefensiveWeaponState(..parse_state, weapon: Some(weapon)),
        next_input_2,
      )
    }
    Ok(#(
      ElementStart(Tag(
        Name("", "Weapon"),
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
      parse_defensive_weapon_report_inner(
        ParseDefensiveWeaponState(..parse_state, weapon: Some(weapon)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_defensive_weapon_report_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseDefensiveWeaponState(count: Some(count), weapon: Some(weapon)) ->
          Ok(#(DefensiveWeapon(count: count, weapon: weapon), next_input))
        _ -> Error("Missing defensive weapon data")
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at defenses: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_defensive_weapon_report_inner(parse_state, next_input)
  }
}

fn parse_anti_ship(input) {
  parse_anti_ship_inner([], input)
}

fn parse_anti_ship_inner(
  anti_ship: List(Weapon),
  input: Input,
) -> Result(#(List(Weapon), Input), String) {
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
  anti_ship_weapons: List(Weapon),
  input: Input,
) -> Result(#(List(Weapon), Input), String) {
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
    max_damage_per_round: Option(Float),
    fired: Option(Int),
    hits: Option(Int),
    shot_duration: Option(Float),
    battle_short_shots: Option(Int),
    targets_assigned: Option(Int),
    targets_destroyed: Option(Int),
  )
}

fn parse_anti_ship_continuous_weapon(input) {
  parse_anti_ship_continuous_weapon_inner(
    ParseAntiShipContinuousWeaponState(
      name: None,
      damage_dealt: None,
      max_damage_per_round: None,
      fired: None,
      hits: None,
      shot_duration: None,
      battle_short_shots: None,
      targets_assigned: None,
      targets_destroyed: None,
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
      use #(max_damage, next_input_2) <- try(parse_float_element(next_input))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(
          ..parse_state,
          max_damage_per_round: Some(max_damage),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TargetsAssigned"), _)), next_input)) -> {
      use #(targets_assigned, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(
          ..parse_state,
          targets_assigned: Some(targets_assigned),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TargetsDestroyed"), _)), next_input)) -> {
      use #(targets_destroyed, next_input_2) <- try(parse_int_element(
        next_input,
      ))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(
          ..parse_state,
          targets_destroyed: Some(targets_destroyed),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "ShotsFired"), _)), next_input)) -> {
      use #(fired, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_continuous_weapon_inner(
        ParseAntiShipContinuousWeaponState(..parse_state, fired: Some(fired)),
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
          fired: Some(fired),
          hits: Some(hits),
          shot_duration: Some(shot_duration),
          battle_short_shots: Some(battle_short_shots),
          targets_assigned: Some(targets_assigned),
          targets_destroyed: Some(targets_destroyed),
        ) ->
          Ok(#(
            Weapon(
              name: name,
              damage_dealt: damage,
              max_damage_per_round: max_damage,
              type_details: ContinuousDetails(
                shot_duration: shot_duration,
                battle_short_shots: battle_short_shots,
              ),
              fired: fired,
              hits: hits,
              targets_assigned: targets_assigned,
              targets_destroyed: targets_destroyed,
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

type ParseAntiShipWeaponState {
  ParseAntiShipWeaponState(
    name: Option(String),
    max_damage_per_round: Option(Float),
    rounds_carried: Option(Int),
    fired: Option(Int),
    hits: Option(Int),
    damage_dealt: Option(Float),
    targets_assigned: Option(Int),
    targets_destroyed: Option(Int),
  )
}

fn parse_anti_ship_weapon(input) {
  parse_anti_ship_weapon_inner(
    ParseAntiShipWeaponState(
      name: None,
      damage_dealt: None,
      max_damage_per_round: None,
      rounds_carried: None,
      fired: None,
      hits: None,
      targets_assigned: None,
      targets_destroyed: None,
    ),
    input,
  )
}

fn parse_anti_ship_weapon_inner(
  parse_state,
  input,
) -> Result(#(Weapon, Input), String) {
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
      use #(damage, next_input_2) <- try(parse_float_element(next_input))
      parse_anti_ship_weapon_inner(
        ParseAntiShipWeaponState(..parse_state, damage_dealt: Some(damage)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "MaxDamagePerShot"), _)), next_input)) -> {
      use #(max_damage, next_input_2) <- try(parse_float_element(next_input))
      parse_anti_ship_weapon_inner(
        ParseAntiShipWeaponState(
          ..parse_state,
          max_damage_per_round: Some(max_damage),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TargetsAssigned"), _)), next_input)) -> {
      use #(targets_assigned, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_weapon_inner(
        ParseAntiShipWeaponState(
          ..parse_state,
          targets_assigned: Some(targets_assigned),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TargetsDestroyed"), _)), next_input)) -> {
      use #(targets_destroyed, next_input_2) <- try(parse_int_element(
        next_input,
      ))
      parse_anti_ship_weapon_inner(
        ParseAntiShipWeaponState(
          ..parse_state,
          targets_destroyed: Some(targets_destroyed),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "RoundsCarried"), _)), next_input)) -> {
      use #(rounds_carried, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_weapon_inner(
        ParseAntiShipWeaponState(
          ..parse_state,
          rounds_carried: Some(rounds_carried),
        ),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "ShotsFired"), _)), next_input)) -> {
      use #(fired, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_weapon_inner(
        ParseAntiShipWeaponState(..parse_state, fired: Some(fired)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "HitCount"), _)), next_input)) -> {
      use #(hits, next_input_2) <- try(parse_int_element(next_input))
      parse_anti_ship_weapon_inner(
        ParseAntiShipWeaponState(..parse_state, hits: Some(hits)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_anti_ship_weapon_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseAntiShipWeaponState(
          name: Some(name),
          damage_dealt: Some(damage),
          max_damage_per_round: Some(max_damage),
          rounds_carried: Some(rounds_carried),
          fired: Some(fired),
          hits: Some(hits),
          targets_assigned: Some(targets_assigned),
          targets_destroyed: Some(targets_destroyed),
        ) ->
          Ok(#(
            Weapon(
              name: name,
              damage_dealt: damage,
              max_damage_per_round: max_damage,
              type_details: GunDetails(rounds_carried: rounds_carried),
              fired: fired,
              hits: hits,
              targets_assigned: targets_assigned,
              targets_destroyed: targets_destroyed,
            ),
            next_input,
          ))
        _ -> Error("Missing anti ship weapon data")
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at anti ship weapon: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_anti_ship_weapon_inner(parse_state, next_input)
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
  parse_missiles_inner([], input)
}

fn parse_missiles_inner(
  missiles: List(report.Missile),
  input: Input,
) -> Result(#(List(report.Missile), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "OffensiveMissileReport"), _)), next_input)) -> {
      use #(missile, next_input_2) <- try(parse_missile(next_input))
      parse_missiles_inner([missile, ..missiles], next_input_2)
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_missiles_inner(missiles, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> Ok(#(missiles, next_input))
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at missiles: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_missiles_inner(missiles, next_input)
  }
}

type ParseMissileState {
  ParseMissileState(
    name: Option(String),
    damage_dealt: Option(Float),
    carried: Option(Int),
    expended: Option(Int),
    hit: Option(Int),
    miss: Option(Int),
    soft_killed: Option(Int),
    hard_killed: Option(Int),
  )
}

fn parse_missile(input) {
  parse_missile_inner(
    ParseMissileState(
      name: None,
      damage_dealt: None,
      carried: None,
      expended: None,
      hit: None,
      miss: None,
      soft_killed: None,
      hard_killed: None,
    ),
    input,
  )
}

fn parse_missile_inner(
  parse_state,
  input,
) -> Result(#(report.Missile, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(Name("", "MissileName"), _)), next_input)) -> {
      use #(name, next_input_2) <- try(parse_string_element(None, next_input))
      parse_missile_inner(
        ParseMissileState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalDamageDone"), _)), next_input)) -> {
      use #(damage, next_input_2) <- try(parse_float_element(next_input))
      parse_missile_inner(
        ParseMissileState(..parse_state, damage_dealt: Some(damage)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalCarried"), _)), next_input)) -> {
      use #(carried, next_input_2) <- try(parse_int_element(next_input))
      parse_missile_inner(
        ParseMissileState(..parse_state, carried: Some(carried)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "TotalExpended"), _)), next_input)) -> {
      use #(expended, next_input_2) <- try(parse_int_element(next_input))
      parse_missile_inner(
        ParseMissileState(..parse_state, expended: Some(expended)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Hits"), _)), next_input)) -> {
      use #(hit, next_input_2) <- try(parse_int_element(next_input))
      parse_missile_inner(
        ParseMissileState(..parse_state, hit: Some(hit)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Misses"), _)), next_input)) -> {
      use #(miss, next_input_2) <- try(parse_int_element(next_input))
      parse_missile_inner(
        ParseMissileState(..parse_state, miss: Some(miss)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Softkills"), _)), next_input)) -> {
      use #(soft_kill, next_input_2) <- try(parse_int_element(next_input))
      parse_missile_inner(
        ParseMissileState(..parse_state, soft_killed: Some(soft_kill)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Hardkills"), _)), next_input)) -> {
      use #(hard_kill, next_input_2) <- try(parse_int_element(next_input))
      parse_missile_inner(
        ParseMissileState(..parse_state, hard_killed: Some(hard_kill)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_missile_inner(parse_state, next_input_2)
    }
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case parse_state {
        ParseMissileState(
          name: Some(name),
          damage_dealt: Some(damage),
          carried: Some(carried),
          expended: Some(expended),
          hit: Some(hit),
          miss: Some(miss),
          soft_killed: Some(soft_killed),
          hard_killed: Some(hard_killed),
        ) ->
          Ok(#(
            report.Missile(
              name: name,
              damage_dealt: damage,
              carried: carried,
              expended: expended,
              hit: hit,
              miss: miss,
              soft_killed: soft_killed,
              hard_killed: hard_killed,
            ),
            next_input,
          ))
        _ -> {
          Error("Missing missile data ")
        }
      }
    }
    Ok(#(xmlm.Data(data), _)) ->
      Error(string.concat(["Unexpected data at missile: ", data]))
    Ok(#(xmlm.Dtd(_), next_input)) ->
      parse_missile_inner(parse_state, next_input)
  }
}

fn skip_tag(input) {
  skip_tag_inner(input, 0)
}

fn skip_tag_inner(input, depth) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
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
