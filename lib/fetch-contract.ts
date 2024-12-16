import { readdir, readFile } from "node:fs/promises";
import { Abi, Address, PublicClient } from "viem";
import { whatsabi } from "@shazow/whatsabi";
import { Contract } from "@/lib/types";
import { fetchContractFromSourcify } from "@/lib/sourcify";
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

export const fetchContract = async (
  address: Address,
  publicClient: PublicClient,
  artifacts: Artifact[],
  options: CliOptions,
): Promise<Contract | null> => {
  const sourcifyContract = await fetchContractFromSourcify(address, options);
  if (sourcifyContract) {
    return sourcifyContract;
  }
  const bytecode = await publicClient.getCode({ address });
  if (!bytecode) {
    return null;
  }
  const result = await whatsabi.autoload(address, {
    provider: whatsabi.providers.WithCachedCode(publicClient, {
      [address]: bytecode,
    }),
    abiLoader: new whatsabi.loaders.SourcifyABILoader(),
    loadContractResult: true,
  });
  for (let artifact of artifacts) {
    if (artifact.deployedBytecode.object === bytecode) {
      const sources = await Promise.all(
        Object.keys(artifact.metadata.sources).map(async (source) => ({
          path: `${options.projectPath}/${source}`,
          content: await readFile(`${options.projectPath}/${source}`, {
            encoding: "utf-8",
          }),
        })),
      );
      return {
        address,
        info: {
          name:
            Object.values(artifact.metadata.settings.compilationTarget)[0] ??
            address,
          match: "perfect",
          evmVersion: artifact.metadata.settings.evmVersion,
          compilerVersion: artifact.metadata.compiler.version,
          optimizer: artifact.metadata.settings.optimizer ?? {
            enabled: false,
            runs: 200,
          },
          license: "LICENSE",
          language: artifact.metadata.language,
        },
        sources,
        abi: artifact.abi,
      };
    }
  }
  return {
    address,
    info: {
      name: address,
      match: "partial",
      evmVersion: "",
      compilerVersion: "",
      optimizer: {
        enabled: false,
        runs: 200,
      },
      license: "LICENSE",
      language: "Solidity",
    },
    sources: [],
    abi: result.abi as Abi,
  };
};
