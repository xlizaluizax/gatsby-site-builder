import React from "react";
import slugify from "slugify";
import axios from "axios";
import qs from "qs";

import { mapStyle } from "../utils/processCss";
import { metadata as siteMetadata } from "../utils/siteSettings.json";
import { rhythm, scale } from "../utils/typography";
// import colors from "../utils/colors"

import Html from "../atoms/Html";

class BlockForm extends React.Component {
  constructor(props) {
    super(props);
    // _json_ fields
    this.formData = JSON.parse(props.block.form._json_);
    this.optionsData = JSON.parse(props.block.options._json_);
    this.styleData = mapStyle(JSON.parse(props.block.style._json_));
    // Colors
    let { colorPalettes, colorCombo } = this.optionsData;
    colorCombo = colorCombo
      ? props.colors[`${colorCombo}Combo`]
      : props.colors.classicCombo;
    colorPalettes = colorPalettes || props.colors.colorPalettes;
    const newColors = props.colors.computeColors(colorPalettes, colorCombo);
    this.colors = { ...props.colors, ...newColors };
    // Form name
    this.formName = slugify(props.block.name.toLowerCase());
    // Form Fields
    this.fields = this.formData ? this.formData.fields : [];
    this.defaultFieldsState = {};
    this.fields.forEach(field => {
      // for checkboxes, create an entry for each
      if (field.type === `checkbox`) {
        field.options.forEach(option => {
          // special validation fields
          this.defaultFieldsState[
            "validate" + field.name + "_" + option.value
          ] = true;
          // normal fields
          this.defaultFieldsState[field.name + "_" + option.value] =
            !!option.checked || false;
        });
        return;
      }
      // Create validate state for each field
      this.defaultFieldsState["validate" + field.name] = true;
      if (field.type === `comment`) {
        return;
      }
      // for radio button, only one state entry and take the (last) one that is checked
      if (field.type === `radio`) {
        this.defaultFieldsState[field.name] = "";
        field.options.forEach(option => {
          if (option.checked === `checked`)
            this.defaultFieldsState[field.name] = option.value;
        });
        return;
      }
      this.defaultFieldsState[field.name] = field.value || "";
    });
    this.state = {
      success: false,
      error: false,
      [`bot-field`]: typeof window === "undefined" ? "server-side" : "",
      ...this.defaultFieldsState
    };
    if (!_.find(this.fields, [`type`, `submit`])) {
      // this.fields.push({ type: "submit", value: "submit", name: "submit" })
      this.fields.push({ type: "submit", value: "", name: "submit" });
    }
    this.fieldChange = this.fieldChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  fieldChange(e) {
    if (e.target.type === `checkbox`) {
      this.setState({
        [e.target.name]: !this.state[e.target.name]
      });
      return;
    }
    this.setState({
      [e.target.name]: e.target.value
    });
  }

  handleSubmit(e) {
    // TODO:
    e.preventDefault();

    const { success, error, submit, ...fields } = this.state;

    // let myHeaders = new Headers();
    // myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    // const url = this.props.location.pathname.substring(
    //   0,
    //   this.props.location.pathname.length - 1
    // )
    const url = window && window.location.href;
    // const url = siteMetadata.url;

    let fieldsToSend = {};
    Object.keys(fields).forEach(fieldName => {
      if (fieldName.substring(0, 8) !== "validate") {
        fieldsToSend[fieldName] = fields[fieldName];
      }
    });

    // console.log(fieldsToSend);
    // NOTE: DO NOT USE € sign in value fields!!!!!!!!!!!!!!!!!!!!
    axios({
      method: "POST",
      // baseURL: siteMetadata.url,
      url,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      // headers: myHeaders,
      // data: qs.stringify({
      //   "form-name": this.formName,
      //   ...fieldsToSend
      // })
      params: {
        "form-name": this.formName,
        ...fieldsToSend
      }
    })
      .then(res => {
        console.log("OK", res);
        if (res.status >= 400) {
          // alert("Ooops :(\nThere was a problem with the form.")
          this.setState({ success: false, error: true });
          throw new Error("Bad response from server");
        } else if (res.status === 200) {
          console.log("request successful");
          // this.props.openDialog('Bien reçu !', 'Merci pour votre message. Je vous recontacte au plus vite.\n\nFlorence')

          this.setState({
            success: true,
            error: false,
            ...this.defaultFieldsState
            // name: "",
            // phone: "",
            // email: "",
            // message: ""
          });
        } else {
          console.log(`Response: `, res);
        }
      })
      .catch(error => {
        console.log("ERR", error);
        // alert("Ooops :(", "There was a problem with the form.")
        this.setState({ success: false, error: true });
      });

    // fetch(this.props.location.pathname, {
    //   method: "POST",
    //   headers: myHeaders,
    //   body:
    //     "form-name=" +
    //     this.props.block.form.name +
    //     "&botField=" +
    //     this.state.botField +
    //     "&name=" +
    //     this.state.name +
    //     "&phone=" +
    //     this.state.phone +
    //     "&email=" +
    //     this.state.email +
    //     "&message=" +
    //     this.state.message
    // }).then(res => {
    //   if (res.status >= 400) {
    //     // this.props.openDialog('Ooops :(', "Un problème est survenu lors de l'envoi du formulaire. Pouvez-vous me contactez directement par téléphone au 0496.11.59.44.\nMerci.\n\nFlorence")
    //     this.setState({ success: false, error: true })
    //     throw new Error("Bad response from server")
    //   } else if (res.status === 200) {
    //     console.log("request successful")
    //     // this.props.openDialog('Bien reçu !', 'Merci pour votre message. Je vous recontacte au plus vite.\n\nFlorence')
    //     this.setState({
    //       success: true,
    //       error: false,
    //       name: "",
    //       phone: "",
    //       email: "",
    //       message: ""
    //     })
    //   }
    // })
  }

  validate() {
    this.fields.forEach(field => {
      // Early return if field is not required
      if (!field.required && field.type !== `checkbox`) {
        return;
      }
      // if field has a value it is ok EXCEPT for checkboxes
      if (field.type !== `checkbox` && !!this.state[field.name]) {
        if (
          field.type === `email` &&
          !this.state[field.name].match(
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          )
        ) {
          this.setState({
            ["validate" + field.name]: false
          });
          return;
        }
        this.setState({
          ["validate" + field.name]: true
        });
        return;
      }

      if (field.type === `checkbox`) {
        field.options.forEach(option => {
          if (!option.required) return;
          if (this.state[field.name + "_" + option.value]) {
            this.setState({
              ["validate" + field.name + "_" + option.value]: true
            });
          } else {
            this.setState({
              ["validate" + field.name + "_" + option.value]: false
            });
          }
        });
        return;
      }

      this.setState({
        ["validate" + field.name]: false
      });
    });
  }

  render() {
    const block = this.props.block;
    if (Object.keys(block).length < 1) {
      return null;
    }
    // const dataOptions = JSON.parse(block.options._json_)
    const dataOptions = block.options;
    // console.log(block.options)

    const {
      classicCombo,
      contrastCombo,
      funkyCombo,
      funkyContrastCombo
    } = this.colors;

    let fields = this.fields.map(
      (
        {
          type = `text`,
          name,
          value = null,
          label = null,
          options = null,
          ...attributes
        },
        key
      ) => {
        attributes.css = {
          backgroundColor:
            this.state["validate" + name] === false
              ? `rgba(255, 0, 0, 0.15)!important`
              : `initial`
        };
        if (type === "comment") {
          return attributes.text ? (
            <Html key={key} html={attributes.text} />
          ) : null;
        } else if (type === "textarea") {
          return (
            <div key={key}>
              <label htmlFor={type + name}>
                <Html html={label} />
              </label>
              <textarea
                name={name}
                id={type + name}
                {...attributes}
                value={this.state[name]}
                onChange={this.fieldChange}
              />
            </div>
          );
        } else if (type.match(/text|tel|email|date/)) {
          return (
            <div key={key}>
              <label htmlFor={type + name}>
                <Html html={label} />
              </label>
              <input
                type={type}
                name={name}
                id={type + name}
                {...attributes}
                value={this.state[name]}
                onChange={this.fieldChange}
              />
            </div>
          );
        } else if (type.match(/submit/)) {
          return (
            <input
              type={type}
              name={name}
              id={type + name}
              key={key}
              {...attributes}
              value={value || label}
              onClick={() => {
                this.validate();
              }}
            />
          );
        } else if (type.match(/radio/)) {
          return (
            <div key={key} css={attributes.css}>
              {options &&
                options.map(({ value, label }, key) => {
                  return (
                    <div key={key}>
                      <input
                        type={type}
                        name={name}
                        id={type + name + value}
                        {...attributes}
                        value={value}
                        checked={this.state[name] === value}
                        onChange={this.fieldChange}
                      />
                      <label htmlFor={type + name + value}>
                        <span />
                        <Html
                          html={label}
                          passCSS={{
                            display: `inline`
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
            </div>
          );
        } else if (type.match(/checkbox/)) {
          return (
            <div key={key}>
              {options &&
                options.map(({ value, label, required }, key) => {
                  attributes.css = {
                    backgroundColor:
                      this.state["validate" + name + "_" + value] === false
                        ? `rgba(255, 0, 0, 0.15)!important`
                        : `initial`
                  };
                  return (
                    <div key={key} css={attributes.css}>
                      <input
                        type={type}
                        name={`${name}_${value}`}
                        id={type + name + value}
                        {...attributes}
                        required={required}
                        value={value}
                        checked={this.state[name + value]}
                        onChange={this.fieldChange}
                      />
                      <label htmlFor={type + name + value}>
                        <span />
                        <Html
                          html={label}
                          passCSS={{
                            display: `inline`
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
            </div>
          );
        }
      }
    );

    const form = (
      <div>
        {/* {this.props.block.form.before} */}
        <form
          className={slugify(block.name.toLowerCase())}
          onSubmit={this.handleSubmit}
          name={this.formName}
          data-netlify="true"
          data-netlify-honeypot="bot-field"
        >
          <input
            css={{
              // visibility: `hidden`,
              position: `fixed`,
              top: -9999,
              left: -9999,
              width: 1,
              height: 1
            }}
            type="text"
            name="bot-field"
            placeholder="Leave empty!"
            key="bot-field"
            value={this.state[`bot-field`]}
            onChange={this.fieldChange}
          />
          {fields}
        </form>
        {/* {this.props.block.form.after} */}
      </div>
    );
    const success = (
      <div className="formMessage success">
        <Html html={block.successMessage.childMarkdownRemark.html} />
      </div>
    );
    const error = (
      <div className="formMessage error">
        <Html html={block.errorMessage.childMarkdownRemark.html} />
      </div>
    );

    const { id: htmlId, name: htmlName } = this.optionsData;

    return block.form ? (
      <div
        id={htmlId}
        name={htmlName}
        className="block blockForm"
        css={{
          ...this.colors[classicCombo].style,
          padding: rhythm(1),
          display: `flex`,
          justifyContent: `center`,
          alignItems: `center`,
          width: `100%`,
          maxWidth: `1000px`,
          margin: `0 auto`,
          "> div": {
            width: `100%`,
            maxWidth: `1000px`,
            margin: `auto`
          },
          " input[type='radio'] + label > span, input[type='checkbox'] + label > span": {
            background:
              this.colors[classicCombo].background ===
              this.colors.palettes[0].neutral
                ? this.colors[classicCombo].background
                : this.colors[classicCombo].border
          },
          " input[type='radio']:checked + label > span, input[type='checkbox']:checked + label > span": {
            background:
              this.colors[classicCombo].background ===
              this.colors.palettes[0].neutral
                ? this.colors[classicCombo].border
                : this.colors[classicCombo].background
          },
          ...this.props.passCSS,
          ...this.styleData
        }}
      >
        {//
        this.state.error ? error : this.state.success ? success : form
        // success
        }
      </div>
    ) : null;
  }
}

export default BlockForm;

export const blockFormFragment = graphql`
  fragment BlockForm on ContentfulBlockForm {
    id
    name
    internal {
      type
    }
    form {
      _json_
      # fields {
      #   name
      #   type
      #   label
      #   placeholder
      #   rows
      #   value
      #   required
      #   checked
      # }
    }
    successMessage {
      id
      childMarkdownRemark {
        id
        html
      }
    }
    errorMessage {
      id
      childMarkdownRemark {
        id
        html
      }
    }
    options {
      _json_
      # colorPalettes
      # colorCombo
    }
    style {
      _json_
    }
  }
`;
