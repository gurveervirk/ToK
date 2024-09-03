const customStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: '#ccc',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#888',
      },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#fff',
      border: '1px solid #ccc',
      marginTop: 0,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: 0,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#ddd' : '#fff',
      color: state.isSelected ? '#000' : '#333',
      '&:hover': {
        backgroundColor: '#eee',
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#333',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#aaa',
    }),
    input: (provided) => ({
      ...provided,
      color: '#333',
    }),
  };

export default customStyles;