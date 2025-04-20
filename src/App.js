import React from "react";
import { Route, Switch } from "react-router-dom";

import SocketPost from "./socketPost";
import Signup from "./components/Signup";
import Signin from "./components/Signin";

function App() {
  return (
    <React.Fragment>
      <Switch>
        <Route path="/" exact component={SocketPost} />
        <Route path="/signup" exact component={Signup} />
        <Route path="/signin" exact component={Signin} />
      </Switch>
    </React.Fragment>
  );
}

export default App;
