import gleam/dict.{type Dict}
import gleam/float
import gleam/int
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result.{try}
import xmlm.{type Input, type Tag, ElementEnd, ElementStart, Tag}

pub type ParsedValueDecoder(parsed_type) {
  ParsedValueDecoder(
    fn(Tag, Dict(Option(Tag), ParsedValue(parsed_type))) ->
      Result(parsed_type, String),
  )
}

pub type ParseValue(contained) {
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

pub type ParsedValue(contained) {
  ParsedValueString(String)
  ParsedValueInt(Int)
  ParsedValueFloat(Float)
  ParsedValueList(List(contained))
  ParsedValueSubElement(contained)
}

pub fn parse_map(
  field_config: Dict(Option(Tag), ParseValue(contained)),
  input: Input,
  is_root: Bool,
) -> Result(#(Dict(Option(Tag), ParsedValue(contained)), Input), String) {
  parse_map_inner(field_config, dict.new(), input, is_root)
}

pub fn parse_map_inner(
  field_config: Dict(Option(Tag), ParseValue(contained)),
  parsed_fields: Dict(Option(Tag), ParsedValue(contained)),
  input: Input,
  is_root: Bool,
) -> Result(#(Dict(Option(Tag), ParsedValue(contained)), Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _) as tag), next_input)) -> {
      case dict.get(field_config, Some(tag)) {
        Ok(ParseValueSubElement(sub_field_config, ParsedValueDecoder(decoder))) -> {
          echo #(
            "Parsing sub element: " <> tag.name.local <> " with config: ",
            sub_field_config,
          )
          use #(sub_parsed_fields, next_input_2) <- try(parse_map_inner(
            sub_field_config,
            dict.new(),
            next_input,
            False,
          ))
          echo #("Got sub fields: ", sub_parsed_fields)
          use new_decoded_value <- try(decoder(tag, sub_parsed_fields))
          echo #("Decoded value: ", new_decoded_value)
          let next_parsed_fields =
            dict.insert(
              parsed_fields,
              Some(tag),
              ParsedValueSubElement(new_decoded_value),
            )
          case is_root {
            True -> {
              echo "Root element parsed, returning"
              Ok(#(next_parsed_fields, next_input_2))
            }
            False -> {
              echo "Continuing parsing after sub element"
              parse_map_inner(
                field_config,
                next_parsed_fields,
                next_input_2,
                False,
              )
            }
          }
        }
        Ok(ParseValueList(sub_field_config, ParsedValueDecoder(decoder))) -> {
          use #(sub_parsed_fields, next_input_2) <- try(parse_map_inner(
            sub_field_config,
            dict.new(),
            next_input,
            False,
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
          parse_map_inner(
            field_config,
            next_parsed_fields,
            next_input_2,
            is_root,
          )
        }
        Ok(ParseValueString) -> {
          use #(value, next_input_2) <- try(parse_string_element(
            None,
            next_input,
          ))
          let next_parsed_fields =
            dict.insert(parsed_fields, Some(tag), ParsedValueString(value))
          parse_map_inner(
            field_config,
            next_parsed_fields,
            next_input_2,
            is_root,
          )
        }
        Ok(ParseValueInt) -> {
          use #(value, next_input_2) <- try(parse_int_element(next_input))
          let next_parsed_fields =
            dict.insert(parsed_fields, Some(tag), ParsedValueInt(value))
          parse_map_inner(
            field_config,
            next_parsed_fields,
            next_input_2,
            is_root,
          )
        }
        Ok(ParseValueFloat) -> {
          use #(value, next_input_2) <- try(parse_float_element(next_input))
          let next_parsed_fields =
            dict.insert(parsed_fields, Some(tag), ParsedValueFloat(value))
          parse_map_inner(
            field_config,
            next_parsed_fields,
            next_input_2,
            is_root,
          )
        }
        Error(Nil) -> {
          echo #("Skipping", tag)
          use next_input <- try(skip_tag(next_input))
          parse_map_inner(field_config, parsed_fields, next_input, False)
        }
      }
    }
    Ok(#(ElementEnd, next_input)) -> {
      let final_parsed_fields =
        dict.map_values(parsed_fields, fn(_key, value) {
          case value {
            ParsedValueList(values) -> ParsedValueList(list.reverse(values))
            _ -> value
          }
        })
      Ok(#(final_parsed_fields, next_input))
    }
    Ok(#(xmlm.Data(data), next_input)) -> {
      let next_parsed_fields =
        dict.insert(parsed_fields, None, ParsedValueString(data))
      parse_map_inner(field_config, next_parsed_fields, next_input, is_root)
    }

    Ok(#(xmlm.Dtd(_), next_input)) -> {
      parse_map_inner(field_config, parsed_fields, next_input, is_root)
    }
  }
}

pub fn skip_tag(input) {
  skip_tag_inner(input, 0)
}

pub fn skip_tag_inner(input, depth) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _)), next_input)) -> {
      //echo #("Skipping sub tag: ", tag)
      skip_tag_inner(next_input, depth + 1)
    }
    Ok(#(ElementEnd, next_input)) ->
      case depth {
        0 -> Ok(next_input)
        _ -> skip_tag_inner(next_input, depth - 1)
      }
    Ok(#(_, next_input)) -> skip_tag_inner(next_input, depth)
  }
}

pub fn parse_string_element(
  maybe_name,
  input,
) -> Result(#(String, Input), String) {
  case xmlm.signal(input) {
    Error(e) -> Error(xmlm.input_error_to_string(e))
    Ok(#(ElementStart(Tag(_, _)), _)) ->
      Error("unexpected nested element for string element")
    Ok(#(ElementEnd, next_input)) -> {
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

pub fn parse_int_element(input) -> Result(#(Int, Input), String) {
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

pub fn parse_float_element(input) -> Result(#(Float, Input), String) {
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
