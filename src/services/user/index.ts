export const getUserByToken = async (token: string) => {
  return await fetch(`http://localhost:3001/api/auth`, {
    method: 'GET',
    headers: {
      Authorization: token,
    },
  }).then((res) => res.json());
};
