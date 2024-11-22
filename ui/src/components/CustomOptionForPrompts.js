import React from 'react';
import { components } from 'react-select';

const CustomOptionForPrompts = (props) => {
  const { innerRef, innerProps, data, handleDelete, handleTemplateSelect, isDefault, isSelected } = props;

  return (
    <components.Option {...props} innerRef={innerRef} innerProps={innerProps}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {props.children} 
        {isDefault && <span
          style={{
            cursor: 'pointer',
            marginLeft: 'auto',
            color: 'black',
            fontSize: '12px',
            lineHeight: '1'
          }}
          title="Default"
        >&#9733;
        </span>} 
        {isSelected && <span
          style={{
            cursor: 'pointer',
            marginLeft: !isDefault ? 'auto' : '1em',
            color: 'black',
            fontSize: '12px',
            lineHeight: '1'
          }}
          title="Selected"
        >&#128280;
        </span>}
        <span
          onClick={() => handleTemplateSelect(data)}
          style={{
            cursor: 'pointer',
            marginLeft: !isDefault && !isSelected ? 'auto' : '1em',
            color: 'black',
            fontSize: '12px',
            lineHeight: '1'
          }}
          title="Select as Template or Update"
        >
          &#128393;
        </span>
        {!isDefault && !isSelected && <span
          onClick={() => handleDelete(data)}
          style={{
            cursor: 'pointer',
            marginLeft: '1em', // Push the cross to the right end
            color: 'black',
            fontSize: '12px',
            lineHeight: '1'
          }}
          title="Delete"
        >
          &#10005;
        </span>}
      </div>
    </components.Option>
  );
};

export default CustomOptionForPrompts;
