import data/report.{type Player, type Ship, type Team, Player, Report, Team}
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
      echo #("Skipping tag: ", tag)
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
      echo #("Skipping tag: ", tag)
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
      use #(name, next_input_2) <- try(parse_player_name(None, next_input))
      parse_player_inner(
        ParsePlayerState(..parse_state, name: Some(name)),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(Name("", "Ships"), _)), next_input)) -> {
      use next_input_2 <- try(skip_tag(next_input))
      parse_player_inner(
        ParsePlayerState(..parse_state, ships: []),
        next_input_2,
      )
    }
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      echo #("Skipping tag: ", tag)
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

fn parse_player_name(maybe_name, input) -> Result(#(String, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _)), _)) ->
      Error("unexpected nested element for player name")
    Ok(#(xmlm.ElementEnd, next_input)) -> {
      case maybe_name {
        Some(name) -> Ok(#(name, next_input))
        _ -> Error("Missing player name")
      }
    }
    Ok(#(xmlm.Data(name), next_input)) ->
      parse_player_name(Some(name), next_input)
    Ok(#(xmlm.Dtd(_), next_input)) -> parse_player_name(maybe_name, next_input)
  }
}

fn skip_tag(input) {
  skip_tag_inner(input, 0)
}

fn skip_tag_inner(input, depth) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      echo #("Skipping sub tag: ", tag)
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
