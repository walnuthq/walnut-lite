import { readdir, readFile } from "node:fs/promises";
import { Abi, Address, PublicClient } from "viem";
import { whatsabi } from "@shazow/whatsabi";
import { Contract } from "@/lib/types";
import { Artifact, CliOptions } from "@/lib/types";

export const loadArtifacts = async (projectPath: string) => {
  const result = [];
  const outDirs = await readdir(`${projectPath}/out`);
  const artifactsDirs = outDirs.filter((outDir) => outDir.endsWith(".sol"));
  for (let artifactsDir of artifactsDirs) {
    const artifactsFiles = await readdir(`${projectPath}/out/${artifactsDir}`);
    for (let artifactFile of artifactsFiles) {
      const artifactRaw = await readFile(
        `${projectPath}/out/${artifactsDir}/${artifactFile}`,
        { encoding: "utf-8" },
      );
      const artifact = JSON.parse(artifactRaw) as Artifact;
      result.push(artifact);
    }
  }
  return result;
};

const emptyContractResult = (
  address: Address,
): whatsabi.loaders.ContractResult => ({
  ok: false,
  abi: [],
  name: address,
  evmVersion: "",
  compilerVersion: "",
  runs: 0,
});

class FoundryABILoader implements whatsabi.loaders.ABILoader {
  readonly name = "FoundryABILoader";
  provider: whatsabi.providers.Provider;
  projectPath: string;
  artifacts: Artifact[];
  constructor(config: {
    provider: whatsabi.providers.Provider;
    projectPath: string;
    artifacts: Artifact[];
  }) {
    this.provider = config.provider;
    this.projectPath = config.projectPath;
    this.artifacts = config.artifacts;
  }
  async findArtifact(address: Address) {
    const bytecode = await this.provider.getCode(address);
    return this.artifacts.find(
      ({ deployedBytecode }) => deployedBytecode.object === bytecode,
    );
  }
  async loadABI(address: Address): Promise<any[]> {
    const artifact = await this.findArtifact(address);
    return artifact ? (artifact.abi as any[]) : [];
  }
  async getContract(
    address: Address,
  ): Promise<whatsabi.loaders.ContractResult> {
    const artifact = await this.findArtifact(address);
    if (artifact) {
      return {
        abi: artifact.abi as any[],
        name:
          Object.values(artifact.metadata.settings.compilationTarget)[0] ??
          address,
        evmVersion: artifact.metadata.settings.evmVersion,
        compilerVersion: artifact.metadata.compiler.version,
        runs: artifact.metadata.settings.optimizer?.runs ?? 0,
        getSources: async () => {
          return Promise.all(
            Object.keys(artifact.metadata.sources).map(async (source) => ({
              path: `${this.projectPath}/${source}`,
              content: await readFile(`${this.projectPath}/${source}`, {
                encoding: "utf-8",
              }),
            })),
          );
        },
        ok: true,
        loader: this,
        loaderResult: artifact,
      };
    }
    return emptyContractResult(address);
  }
}

export const fetchContract = async (
  address: Address,
  publicClient: PublicClient,
  artifacts: Artifact[],
  options: CliOptions,
): Promise<Contract> => {
  const bytecode = await publicClient.getCode({ address });
  if (!bytecode) {
    throw new Error(`Error: no bytecode found for ${address}`);
  }
  const provider = whatsabi.providers.WithCachedCode(publicClient, {
    [address]: bytecode,
  });
  const result = await whatsabi.autoload(address, {
    provider,
    abiLoader: new whatsabi.loaders.MultiABILoader([
      new FoundryABILoader({
        provider,
        projectPath: options.projectPath,
        artifacts,
      }),
      new whatsabi.loaders.SourcifyABILoader({ chainId: options.chainId }),
    ]),
    loadContractResult: true,
  });
  if (result.contractResult) {
    const [sources, proxyResult] = await Promise.all([
      result.contractResult.getSources && result.contractResult.getSources(),
      result.followProxies && result.followProxies(),
    ]);
    if (proxyResult && proxyResult.contractResult) {
      result.contractResult.abi = proxyResult.contractResult.abi;
    }
    return {
      address,
      bytecode,
      name: result.contractResult.name ?? address,
      sources: sources ?? [],
      abi: result.contractResult.abi,
    };
  }
  return {
    address,
    bytecode,
    name: address,
    sources: [],
    abi: result.abi as Abi,
  };
};
