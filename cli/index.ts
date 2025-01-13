import yargs, { ArgumentsCamelCase } from "yargs";
import { hideBin } from "yargs/helpers";
import { createPublicClient, Hash, http, Address } from "viem";
import trace from "@/lib/trace";
import simulate from "@/lib/simulate";
import { BlockTag } from "tevm/actions";

const getBlockParameter = (block: string): `0x${string}` | Hash | BlockTag => {
  if (["latest", "earliest", "pending", "safe", "finalized"].includes(block)) {
    return block as BlockTag;
  }
  if (block.length === 66) {
    return block as Hash;
  }
  if (!isNaN(Number(block))) {
    return `0x${Number(block).toString(16)}`;
  }
  return "latest";
};

const getCliOptions = async (argv: ArgumentsCamelCase) => {
  const rpcUrl = argv.rpcUrl as string;
  let chainId = argv.chain as number;
  if (chainId === 0) {
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });
    chainId = await publicClient.getChainId();
  }
  return {
    rpcUrl,
    chainId,
    projectPath: argv.projectPath as string,
    verbose: argv.verbose as boolean,
    block: getBlockParameter(argv.block as string),
    txIndex: argv.txIndex ? (argv.txIndex as number) : undefined,
  };
};

yargs(hideBin(process.argv))
  .usage("Usage: $0 <command> [options]")
  .command(
    "trace <hash>",
    "Trace a transaction",
    (yargs) => {
      return yargs.positional("hash", {
        description: "Transaction hash to trace",
        type: "string",
      });
    },
    async (argv) => {
      if (argv.hash === undefined || !argv.hash.startsWith("0x")) {
        console.error("hash missing");
        return;
      }
      if (!argv.rpcUrl) {
        console.error("rpcUrl missing");
        return;
      }
      const options = await getCliOptions(argv);
      trace(argv.hash as Hash, options);
    },
  )
  .command(
    "simulate <to> [sig] [args..]",
    "Simulate a transaction",
    (yargs) => {
      return yargs
        .positional("to", {
          description:
            "Transaction destination, can be an ENS name or an address",
          type: "string",
        })
        .positional("sig", {
          description: "Function signature eg. someFunction(uint256,bytes4)",
          type: "string",
        })
        .positional("args", {
          description: "Function arguments eg. 256 0x12345678",
          type: "string",
          array: true,
        });
    },
    async (argv) => {
      if (argv.to === undefined) {
        console.error("to missing");
        return;
      }
      if (!argv.rpcUrl) {
        console.error("rpcUrl missing");
        return;
      }
      const options = await getCliOptions(argv);
      simulate(argv.to as Address, argv.sig, argv.args, options);
    },
  )
  .option("rpc-url", {
    alias: "r",
    type: "string",
    description: "The RPC endpoint",
    default: "http://localhost:8545",
    // default: "https://sepolia.optimism.io",
  })
  .demandOption("rpc-url", "Please provide a RPC endpoint")
  .option("chain", {
    alias: "c",
    type: "string",
    description: "The chain name or EIP-155 chain ID",
    default: "0",
  })
  .coerce("chain", (chain) => {
    const chainId = Number(chain);
    if (Number.isNaN(chainId)) {
      // TODO deduce from chain name
      return 0;
    }
    return chainId;
  })
  .option("project-path", {
    alias: "p",
    type: "string",
    description: "Foundry/Hardhat project path to load SolC artifacts from",
    default: process.cwd(),
  })
  .option("block", {
    alias: "b",
    type: "string",
    description: "Block number or hash to run a simulation at",
    default: "latest",
  })
  .option("tx-index", {
    type: "number",
    description:
      "If set, the state at the given transaction index will be used to tracing (default = the last transaction index in the block)",
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Run with verbose logging",
    default: false,
  })
  .demandCommand()
  .scriptName("walnut-lite")
  .help()
  .parse();
