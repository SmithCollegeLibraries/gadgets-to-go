import { Button } from 'reactstrap';
import axios from 'axios';
import PropTypes from 'prop-types';

function SaveChangesButton({
  localStyles,
  baseUrl,
  token,
  mapLocations,
}) {
  const handleSaveChanges = async () => {
    try {
      // Save styles
      const stylesArray = Object.keys(localStyles).map((key) => ({
        type: key,
        color_hash: localStyles[key],
        location: mapLocations,
      }));

      await axios.post(`${baseUrl}/styling/update`, stylesArray, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Save inventory data if needed
      // Implement saving inventory data to the server

      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes.');
    }
  };

  return (
    <Button color="success" onClick={handleSaveChanges}>
      Save Changes
    </Button>
  );
}

SaveChangesButton.propTypes = {
  localStyles: PropTypes.object.isRequired,
  baseUrl: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  mapLocations: PropTypes.string.isRequired,
};

export default SaveChangesButton;
