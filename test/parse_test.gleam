import gleam/dict
import gleam/list
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

type TagC {
  TagC(List(TagD))
}

type TagD {
  TagD(String)
}

type TagCAndD {
  AllTagsTagC(TagC)
  AllTagsTagD(TagD)
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

  let parse_result = parse_helpers.parse_map(root_field_config(), input, True)

  case parse_result {
    Ok(#(parsed_fields, _next_input)) -> {
      let output = root_decoder(parsed_fields)
      should.equal(output, Ok(AllTagsATag(TagA(TagB("Value")))))
    }
    Error(_) -> {
      should.fail()
    }
  }
}

fn root_field_config_2() {
  dict.from_list([
    #(
      Some(Tag(Name("", "TagC"), [])),
      ParseValueSubElement(
        tag_c_field_config(),
        parse_helpers.ParsedValueDecoder(tag_c_child_decoder),
      ),
    ),
  ])
}

fn root_decoder_2(parsed_fields) {
  let tag_c = dict.get(parsed_fields, Some(Tag(Name("", "TagC"), [])))
  case tag_c {
    Ok(parse_helpers.ParsedValueSubElement(AllTagsTagC(value))) ->
      Ok(AllTagsTagC(value))
    _ -> Error("Failed to decode TagC")
  }
}

fn tag_c_field_config() {
  dict.from_list([
    #(
      Some(Tag(Name("", "TagD"), [])),
      parse_helpers.ParseValueList(
        tag_d_field_config(),
        parse_helpers.ParsedValueDecoder(tag_d_child_decoder),
      ),
    ),
  ])
}

fn tag_d_field_config() {
  dict.from_list([#(None, parse_helpers.ParseValueString)])
}

fn tag_c_child_decoder(tag, parsed_fields) {
  case tag {
    Tag(Name("", "TagC"), _) -> {
      let field_value = dict.get(parsed_fields, Some(Tag(Name("", "TagD"), [])))
      case field_value {
        Ok(parse_helpers.ParsedValueList(values)) -> {
          let d_tags =
            values
            |> list.filter_map(fn(value) {
              case value {
                AllTagsTagD(tag_d) -> Ok(tag_d)
                _ -> Error(Nil)
              }
            })
          Ok(AllTagsTagC(TagC(d_tags)))
        }
        _ -> Error("Failed to decode TagC")
      }
    }
    _ -> Error("Unexpected tag " <> tag.name.local)
  }
}

fn tag_d_child_decoder(tag, parsed_fields) {
  case tag {
    Tag(Name("", "TagD"), _) -> {
      let field_value = dict.get(parsed_fields, None)
      case field_value {
        Ok(parse_helpers.ParsedValueString(value)) ->
          Ok(AllTagsTagD(TagD(value)))
        _ -> Error("Failed to decode TagD")
      }
    }
    _ -> Error("Unexpected tag " <> tag.name.local)
  }
}

pub fn parse_nested_list_test() {
  let input_string =
    "
    <TagC>
        <TagD>
            Value1
        </TagD>
        <TagD>
            Value2
        </TagD>
    </TagC>"
  let input =
    input_string
    |> xmlm.from_string()
    |> xmlm.with_stripping(True)

  let parse_result = parse_helpers.parse_map(root_field_config_2(), input, True)
  case parse_result {
    Ok(#(parsed_fields, _next_input)) -> {
      let output = root_decoder_2(parsed_fields)
      should.equal(
        output,
        Ok(AllTagsTagC(TagC([TagD("Value1"), TagD("Value2")]))),
      )
    }
    Error(_) -> {
      should.fail()
    }
  }
}
