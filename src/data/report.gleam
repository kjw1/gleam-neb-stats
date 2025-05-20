pub type AntiShipWeapon {
  AntiShipWeapon(name: String, damage_dealt: Float)
}

pub type Ship {
  Ship(
    name: String,
    class: String,
    damage_taken: Int,
    anti_ship_weapons: List(AntiShipWeapon),
  )
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
      Player(name: "Alice", ships: [
        Ship(
          name: "Ship A",
          class: "Class A",
          damage_taken: 80,
          anti_ship_weapons: [
            AntiShipWeapon(name: "Cannon", damage_dealt: 100.0),
            AntiShipWeapon(name: "Missile", damage_dealt: 200.0),
          ],
        ),
      ]),
    ]),
    team_b: Team(players: [
      Player(name: "Bob", ships: [
        Ship(
          name: "Ship B",
          class: "Class B",
          damage_taken: 80,
          anti_ship_weapons: [
            AntiShipWeapon(name: "Torpedo", damage_dealt: 150.0),
            AntiShipWeapon(name: "Rocket", damage_dealt: 250.0),
          ],
        ),
      ]),
    ]),
  )
}
