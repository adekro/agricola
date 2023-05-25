import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";

export const FarmDetails = ({ farmland }) => {
  return (
    <div>
      <List sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
        <ListItem alignItems="flex-start">
          <ListItemText primary="Farming" secondary={farmland.type} />
        </ListItem>
        <Divider variant="fullWidth" component="li" />
        <ListItem alignItems="flex-start">
          <ListItemText primary="Owner" secondary={farmland.ownerDisplayName} />
        </ListItem>
        <Divider variant="fullWidth" component="li" />
        <ListItem alignItems="flex-start">
          <ListItemText primary="Area (ha)" secondary={farmland.area} />
        </ListItem>
        <Divider variant="fullWidth" component="li" />
        <ListItem alignItems="flex-start">
          <ListItemText
            primary="Perimeter (m)"
            secondary={farmland.perimeter}
          />
        </ListItem>
        {farmland.notes && (
          <>
            <Divider variant="fullWidth" component="li" />
            <ListItem alignItems="flex-start">
              <ListItemText primary="Notes" secondary={farmland.notes} />
            </ListItem>
          </>
        )}
      </List>
    </div>
  );
};
