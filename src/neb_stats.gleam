import lustre
import pages/report

pub fn main() {
  let app = lustre.simple(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn init(_flags) {
  report.init()
}

fn update(state, _msg) {
  state
}

fn view(state) {
  report.view(state)
}
