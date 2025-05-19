pub type Report {
  Report(team_a: Team, team_b: Team)
}

pub type Team {
  Player(name: String, ships: List(Ship))
}

pub type Ship {
  Ship(name: String, class: String)
}
