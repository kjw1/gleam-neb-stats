import gleam/dict
import gleam/option.{None, Some}
import gleeunit/should
import parse_helpers.{ParseValueSubElement}
import xmlm.{Name, Tag}

pub type TagA {
  TagA(TagB)
}

pub type TagB {
  TagB(String)
}

pub type AllTags {
  AllTagsATag(TagA)
  AllTagsBTag(TagB)
}

fn tag_a_field_config() {
  dict.from_list([
    #(
      Some(Tag(Name("", "TagB"), [])),
      parse_helpers.ParseValueSubElement(
        tag_b_field_config(),
        parse_helpers.ParsedValueDecoder(tag_b_child_decoder),
      ),
    ),
  ])
}

fn tag_a_child_decoder(tag, parsed_fields) {
  case tag {
    Tag(Name("", "TagA"), _) -> {
      tag_a_decoder(parsed_fields)
    }
    _ -> Error("Failed to decode TagA")
  }
}

fn tag_a_decoder(parsed_fields) {
  let tag_b = dict.get(parsed_fields, Some(Tag(Name("", "TagB"), [])))
  case tag_b {
    Ok(parse_helpers.ParsedValueSubElement(AllTagsBTag(value))) ->
      Ok(AllTagsATag(TagA(value)))
    _ -> Error("Failed to decode TagA")
  }
}

fn root_field_config() {
  dict.from_list([
    #(
      Some(Tag(Name("", "TagA"), [])),
      ParseValueSubElement(
        tag_a_field_config(),
        parse_helpers.ParsedValueDecoder(tag_a_child_decoder),
      ),
    ),
  ])
}

fn root_decoder(parsed_fields) {
  let tag_a = dict.get(parsed_fields, Some(Tag(Name("", "TagA"), [])))
  case tag_a {
    Ok(parse_helpers.ParsedValueSubElement(AllTagsATag(value))) ->
      Ok(AllTagsATag(value))
    _ -> Error("Failed to decode TagA")
  }
}

fn tag_b_field_config() {
  dict.from_list([#(None, parse_helpers.ParseValueString)])
}

fn tag_b_child_decoder(tag, parsed_fields) {
  case tag {
    Tag(Name("", "TagB"), _) -> {
      let field_value = dict.get(parsed_fields, None)
      case field_value {
        Ok(parse_helpers.ParsedValueString(value)) ->
          Ok(AllTagsBTag(TagB(value)))
        _ -> {
          echo parsed_fields
          Error("Failed to decode TagB")
        }
      }
    }
    _ -> Error("Unexpected tag " <> tag.name.local)
  }
}

pub fn parse_nested_object_test() {
  let input_string =
    "
<TagA>
    <TagB>
        Value
    </TagB>
</TagA>"

  let input =
    input_string
    |> xmlm.from_string()
    |> xmlm.with_stripping(True)

  let parse_result = parse_helpers.parse_map(root_field_config(), input)

  case parse_result {
    Ok(#(parsed_fields, _next_input)) -> {
      let output = root_decoder(parsed_fields)
      echo output
      should.equal(output, Ok(AllTagsATag(TagA(TagB("Value")))))
    }
    Error(e) -> {
      echo e
      should.fail()
    }
  }
}
