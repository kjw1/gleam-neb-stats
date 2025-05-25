pub type TeamAOrB {
  TeamA
  TeamB
}

pub type Weapon {
  Weapon(
    name: String,
    max_damage_per_round: Float,
    fired: Int,
    hits: Int,
    damage_dealt: Float,
    type_details: WeaponTypeDetails,
    targets_assigned: Int,
    //used for defensive weapons
    targets_destroyed: Int,
    //used for defensive weapons
  )
}

pub type WeaponTypeDetails {
  GunDetails(rounds_carried: Int)
  ContinuousDetails(shot_duration: Float, battle_short_shots: Int)
  CraftMissileDetails(
    sortied: Int,
    miss: Int,
    soft_killed: Int,
    hard_killed: Int,
  )
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
    anti_ship_weapons: List(Weapon),
    anti_ship_missiles: List(Missile),
    defensive_weapons: List(DefensiveWeapon),
  )
}

pub type DefensiveWeapon {
  DefensiveWeapon(count: Int, weapon: Weapon)
}

pub type Craft {
  Craft(
    name: String,
    class: String,
    carried: Int,
    lost: Int,
    sorties: Int,
    anti_ship_weapons: List(Weapon),
  )
}

pub type Player {
  Player(name: String, ships: List(Ship), craft: List(Craft))
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
      Player(
        name: "Alice",
        ships: [
          Ship(
            name: "Ship A",
            class: "Class A",
            damage_taken: 80,
            anti_ship_weapons: [
              Weapon(
                name: "Cannon",
                damage_dealt: 100.0,
                max_damage_per_round: 50.0,
                fired: 3,
                hits: 2,
                type_details: GunDetails(rounds_carried: 5),
                targets_assigned: 0,
                targets_destroyed: 0,
              ),
              Weapon(
                name: "Beam",
                damage_dealt: 200.0,
                max_damage_per_round: 100.0,
                fired: 5,
                hits: 3,
                targets_assigned: 0,
                targets_destroyed: 0,
                type_details: ContinuousDetails(
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
            defensive_weapons: [
              DefensiveWeapon(
                count: 2,
                weapon: Weapon(
                  name: "Defensive Cannon",
                  damage_dealt: 50.0,
                  max_damage_per_round: 25.0,
                  fired: 4,
                  hits: 1,
                  targets_assigned: 0,
                  targets_destroyed: 0,
                  type_details: GunDetails(rounds_carried: 10),
                ),
              ),
            ],
          ),
        ],
        craft: [
          Craft(
            name: "Craft A",
            class: "Class A",
            carried: 5,
            lost: 2,
            sorties: 10,
            anti_ship_weapons: [],
          ),
        ],
      ),
    ]),
    team_b: Team(players: [
      Player(
        name: "Bob",
        ships: [
          Ship(
            name: "Ship B",
            class: "Class B",
            damage_taken: 80,
            defensive_weapons: [
              DefensiveWeapon(
                count: 3,
                weapon: Weapon(
                  name: "Defensive Laser",
                  damage_dealt: 30.0,
                  max_damage_per_round: 15.0,
                  fired: 6,
                  hits: 2,
                  type_details: GunDetails(rounds_carried: 8),
                  targets_assigned: 0,
                  targets_destroyed: 0,
                ),
              ),
            ],
            anti_ship_weapons: [
              Weapon(
                name: "Torpedo",
                damage_dealt: 150.0,
                max_damage_per_round: 50.0,
                fired: 3,
                hits: 2,
                type_details: GunDetails(rounds_carried: 5),
                targets_assigned: 0,
                targets_destroyed: 0,
              ),
              Weapon(
                name: "Plasma Beam",
                damage_dealt: 250.0,
                max_damage_per_round: 100.0,
                fired: 5,
                hits: 3,
                type_details: ContinuousDetails(
                  shot_duration: 2.0,
                  battle_short_shots: 1,
                ),
                targets_assigned: 0,
                targets_destroyed: 0,
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
        ],
        craft: [
          Craft(
            name: "Craft B",
            class: "Class B",
            carried: 10,
            lost: 5,
            sorties: 20,
            anti_ship_weapons: [],
          ),
        ],
      ),
    ]),
  )
}
