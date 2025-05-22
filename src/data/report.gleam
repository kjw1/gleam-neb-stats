pub type TeamAOrB {
  TeamA
  TeamB
}

pub type AntiShipWeapon {
  AntiShipWeapon(
    name: String,
    max_damage_per_round: Int,
    rounds_fired: Int,
    hits: Int,
    damage_dealt: Float,
    type_details: AntiShipWeaponTypeDetails,
  )
}

pub type AntiShipWeaponTypeDetails {
  AntiShipWeaponGunDetails(rounds_carried: Int)
  AntiShipWeaponContinuousDetails(shot_duration: Float, battle_short_shots: Int)
}

pub type Missile {
  Missile(
    name: String,
    damage_dealt: Float,
    carried: Int,
    expended: Int,
    hit: Int,
    miss: Int,
    soft_killed: Int,
    hard_killed: Int,
  )
}

pub type Ship {
  Ship(
    name: String,
    class: String,
    damage_taken: Int,
    anti_ship_weapons: List(AntiShipWeapon),
    anti_ship_missiles: List(Missile),
  )
}

pub type Player {
  Player(name: String, ships: List(Ship))
}

pub type Team {
  Team(players: List(Player))
}

pub type Report {
  Report(winning_team: TeamAOrB, team_a: Team, team_b: Team)
}

pub fn dummy_report() {
  Report(
    winning_team: TeamA,
    team_a: Team(players: [
      Player(name: "Alice", ships: [
        Ship(
          name: "Ship A",
          class: "Class A",
          damage_taken: 80,
          anti_ship_weapons: [
            AntiShipWeapon(
              name: "Cannon",
              damage_dealt: 100.0,
              max_damage_per_round: 50,
              rounds_fired: 3,
              hits: 2,
              type_details: AntiShipWeaponGunDetails(rounds_carried: 5),
            ),
            AntiShipWeapon(
              name: "Beam",
              damage_dealt: 200.0,
              max_damage_per_round: 100,
              rounds_fired: 5,
              hits: 3,
              type_details: AntiShipWeaponContinuousDetails(
                shot_duration: 2.0,
                battle_short_shots: 1,
              ),
            ),
          ],
          anti_ship_missiles: [
            Missile(
              name: "Missile A",
              damage_dealt: 300.0,
              carried: 10,
              expended: 6,
              hit: 3,
              miss: 1,
              soft_killed: 1,
              hard_killed: 2,
            ),
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
            AntiShipWeapon(
              name: "Torpedo",
              damage_dealt: 150.0,
              max_damage_per_round: 50,
              rounds_fired: 3,
              hits: 2,
              type_details: AntiShipWeaponGunDetails(rounds_carried: 5),
            ),
            AntiShipWeapon(
              name: "Plasma Beam",
              damage_dealt: 250.0,
              max_damage_per_round: 100,
              rounds_fired: 5,
              hits: 3,
              type_details: AntiShipWeaponContinuousDetails(
                shot_duration: 2.0,
                battle_short_shots: 1,
              ),
            ),
          ],
          anti_ship_missiles: [
            Missile(
              name: "Missile B",
              damage_dealt: 350.0,
              carried: 20,
              expended: 12,
              hit: 5,
              miss: 2,
              soft_killed: 2,
              hard_killed: 3,
            ),
          ],
        ),
      ]),
    ]),
  )
}
