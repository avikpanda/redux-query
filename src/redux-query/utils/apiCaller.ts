export type FetcherOptions = {
  queryString: string;
  variables?: FetcherVariables;
};

export type FetcherVariables = { [key: string]: string | any | undefined };

export type FetcherResults<T> = {
  data: T;
};

const fetcher = async <T>(
  apiUrl: string,
  { queryString, variables }: FetcherOptions
): Promise<FetcherResults<T>> => {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queryString,
      variables,
    }),
  });
  const { data, errors } = await res.json();

  if (errors) {
    throw new Error(errors.message ?? `Something went wrong for ${apiUrl}!`);
  }

  return { data };
};

export default fetcher;
