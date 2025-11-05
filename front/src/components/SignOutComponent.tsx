import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SignOutProps {
  setAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

const SignOutComponent: React.FC<SignOutProps> = ({ setAuthenticated }) => {
  const navigate = useNavigate();

  const signOutUser = async () => {
    const body_obj = new FormData()
    let user = localStorage.getItem("username") || ""

    if(user == "") {
      console.log("Username not found") 
    }

    body_obj.append("username", user)

    fetch("http://localhost:8085/logout", {
      method: "POST",
      headers: {
        //"Content-Type": "Application/JSON"
      },
      credentials: 'include',
      body: body_obj
    })
      .then(async (response) => {
        if (response.status === 200) {
          localStorage.removeItem("clientId")
          localStorage.removeItem("username")
          setAuthenticated(false)
          navigate('/');
        }

        else alert(response.statusText);
      })
  }

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: '2px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
  };

  return (
    <button style={buttonStyle} onClick={() => signOutUser()}>
      Sign out
    </button>
  );
};

export default SignOutComponent;
