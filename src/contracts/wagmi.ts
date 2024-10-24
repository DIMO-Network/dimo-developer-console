export const wagmiAbi = [
    {
      inputs: [],
      name: 'getInfo',
      outputs: [
        {
          components: [
            {
              components: [
                {
                  name: 'sender',
                  type: 'address',
                },
                {
                  name: 'x',
                  type: 'uint256',
                },
                {
                  name: 'y',
                  type: 'bool',
                },
              ],
              name: 'foo',
              type: 'tuple',
            },
            {
              name: 'sender',
              type: 'address',
            },
            {
              name: 'z',
              type: 'uint32',
            },
          ],
          name: 'res',
          type: 'tuple',
        },
      ],
      stateMutability: 'pure',
      type: 'function',
    },
  {
    inputs: [
      {
        name: "reason",
        type: "string"
      }
    ],
    name: "InvalidTokenError",
    type: "error"
  },
] as const;