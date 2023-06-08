import { Provider } from "react-redux";
import MyComponent from "./components/MyComponent";
import store from "./redux-query/reudux-api/defaultStore";
import {
  CacheEvictionStrategy,
  CacheHandler,
} from "./redux-query/cache/CacheHandler";
import { useState } from "react";

function App() {
  const [names, setNames] = useState(["Avik"]);

  const cacheHandler = new CacheHandler({
    evictionStrategy: CacheEvictionStrategy.LRU,
    useServiceWorker: false,
  });

  return (
    <Provider store={store}>
      {names.map((name) => (
        <MyComponent key={name} by={name} />
      ))}
      <button
        onClick={() => setNames((state) => [...state, `Avik${state.length}`])}
      >
        Add More
      </button>
    </Provider>
  );
}

export default App;
