import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { apiRequest } from "../redux-query/reudux-api/actionCreators";

function MyComponent({ by }: { by: string }) {
  const dispatch = useDispatch();

  const name: string = useSelector((state) => state?.getUsers);

  useEffect(() => {
    dispatch(apiRequest("getUsers", { page: 1 }));
  }, [dispatch]);

  return <h1>{`Hello There ${name} by ${by}!`}</h1>;
}

export default MyComponent;
