pub type Ship {
  Ship(name: String, class: String)
}

pub type Player {
  Player(name: String, ships: List(Ship))
}

pub type Team {
  Team(players: List(Player))
}

pub type Report {
  Report(team_a: Team, team_b: Team)
}

pub fn dummy_report() {
  Report(
    team_a: Team(players: [
      Player(name: "Alice", ships: [Ship(name: "Ship A", class: "Class A")]),
    ]),
    team_b: Team(players: [
      Player(name: "Bob", ships: [Ship(name: "Ship B", class: "Class B")]),
    ]),
  )
}
