import React from "react";

const Avatar = ({
  name,
  className = "",
  onClick,
}) => {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";
  const classes = className ? className : "avatar";

  return (
    <div className={classes} onClick={onClick}>
      {initial}
    </div>
  );
};

export default Avatar;
