import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { createPublicClient, Hash, http } from "viem";
import trace from "@/lib/trace";

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
      const rpcUrl = argv.rpcUrl as string;
      if (argv.chain === 0) {
        const publicClient = createPublicClient({
          transport: http(rpcUrl),
        });
        argv.chain = await publicClient.getChainId();
      }
      trace(argv.hash as Hash, {
        rpcUrl,
        chainId: argv.chain as number,
        projectPath: argv.projectPath as string,
      });
    },
  )
  .option("rpc-url", {
    alias: "r",
    type: "string",
    description: "The RPC endpoint",
    default: "http://localhost:8545",
    // default: "https://sepolia.optimism.io",
  })
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
  .demandOption("rpc-url", "Please provide a RPC endpoint")
  .demandCommand()
  .scriptName("walnut-lite")
  .help()
  .parse();
