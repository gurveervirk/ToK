import React from 'react';
import { components } from 'react-select';

const CustomOption = (props) => {
  const { innerRef, innerProps, data } = props;

  const handleDelete = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete "${data.label}"?`);
    if (confirmed) {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/delete_model', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: data.value }),
        });
        if (!response.ok) {
          throw new Error('Failed to delete model');
        }
        window.location.reload();
      } catch (error) {
        console.error('Error deleting model:', error);
      }
    }
  };

  return (
    <components.Option {...props} innerRef={innerRef} innerProps={innerProps}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {props.children}
        <span
          onClick={handleDelete}
          style={{
            cursor: 'pointer',
            marginLeft: 'auto', // Push the cross to the right end
            color: 'black',
            fontSize: '12px',
            lineHeight: '1'
          }}
          title="Delete"
        >
          &#10005;
        </span>
      </div>
    </components.Option>
  );
};

export default CustomOption;
