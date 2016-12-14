import React from 'react';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import Main from '../components/Main';
import Home from '../components/Home';
import About from '../components/About';

var routes = (
    <Router history={browserHistory}>
        <Route path="/" component={Main}>
            <IndexRoute component={Home} />
            <Route path="/about" component={About} />
        </Route>
    </Router>
);

export default routes;
