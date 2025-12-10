import { Link } from "react-router-dom";
import "../styles/clickable-username-styles.css";

const ClickableUsername = ({overrideColor, username, id} : {overrideColor?: string, username: string, id: string}) => {
  if(overrideColor)
    return <Link style={{color: overrideColor}} to={`/profile/${id}`} className="clickable-username">{username}</Link>
  return <Link to={`/profile/${id}`} className="clickable-username">{username}</Link>
};

export default ClickableUsername;