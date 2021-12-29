import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import Checkbox, { CheckboxProps } from "antd/lib/checkbox/Checkbox";
import CheckboxGroup, { CheckboxGroupProps } from "antd/lib/checkbox/Group";
import React from "react";
import { traverseReactEltTree } from "./customControls";
import { Registerable } from "./registerable";

class CheckboxWrapper extends React.Component<CheckboxProps> {
  render() {
    return <Checkbox {...this.props} />;
  }
}

export const checkboxMeta: ComponentMeta<CheckboxProps> = {
  name: "AntdCheckbox",
  displayName: "Antd Checkbox",
  props: {
    autoFocus: {
      type: "boolean",
      description: "If get focus when component mounted",
    },
    checked: {
      type: "boolean",
      editOnly: true,
      uncontrolledProp: "defaultChecked",
      description:
        "Specifies the initial state: whether or not the checkbox is selected",
    },
    disabled: {
      type: "boolean",
      description: "If disable checkbox",
    },
    indeterminate: {
      type: "boolean",
      description: "The indeterminate checked state of checkbox",
    },
    value: {
      type: "string",
      description: "The checkbox value",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Checkbox",
        },
      ],
    },
  },
  importPath: "antd/lib/checkbox/Checkbox",
  importName: "Checkbox",
  defaultStyles: {
    marginLeft: "0",
  },
  isDefaultExport: true,
};

export function registerCheckbox(
  loader?: Registerable,
  customCheckboxMeta?: ComponentMeta<CheckboxProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(CheckboxWrapper, customCheckboxMeta ?? checkboxMeta);
}

export const checkboxGroupMeta: ComponentMeta<CheckboxGroupProps> = {
  name: "AntdCheckboxGroup",
  displayName: "Antd Checkbox Group",
  props: {
    disabled: {
      type: "boolean",
      description: "If disable all checkboxes",
    },
    value: {
      type: "choice",
      editOnly: true,
      uncontrolledProp: "defaultValue",
      description: "Default selected value",
      multiSelect: true,
      options: (componentProps) => {
        const options = new Set<string>();
        traverseReactEltTree(componentProps.children, (elt) => {
          if (
            elt?.type === CheckboxWrapper &&
            typeof elt?.props?.value === "string"
          ) {
            options.add(elt.props.value);
          }
        });
        return Array.from(options.keys());
      },
    },
    children: {
      type: "slot",
      allowedComponents: ["AntdCheckbox"],
      defaultValue: [
        {
          type: "component",
          name: "AntdCheckbox",
        },
      ],
    },
  },
  importPath: "antd/lib/checkbox/Group",
  importName: "CheckboxGroup",
  parentComponentName: "AntdCheckbox",
  isDefaultExport: true,
};

export function registerCheckboxGroup(
  loader?: Registerable,
  customCheckboxGroupMeta?: ComponentMeta<CheckboxGroupProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    CheckboxGroup,
    customCheckboxGroupMeta ?? checkboxGroupMeta
  );
}
