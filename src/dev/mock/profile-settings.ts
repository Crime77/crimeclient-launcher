// Dev mock for the profile settings modal (Java, symlinks, export tree, loader version)
// (src/dev/tauriMock.ts asks every src/dev/mock/*.ts first; undefined = not mine).

const INSTANCE_ROOT = "C:/Users/crime77/AppData/Roaming/crimeclient/profiles";

const javaInstalls = [
  {
    path: "C:/Program Files/Eclipse Adoptium/jdk-25.0.1.8-hotspot/bin/javaw.exe",
    major_version: 25,
    vendor: "Eclipse Adoptium",
    architecture: "x64",
    is_default: true,
  },
  {
    path: "C:/Program Files/Java/jdk-21/bin/javaw.exe",
    major_version: 21,
    vendor: "Oracle",
    architecture: "x64",
  },
  {
    path: "C:/Users/crime77/AppData/Roaming/PrismLauncher/java/java-runtime-epsilon/bin/javaw.exe",
    major_version: 25,
    vendor: "Mojang",
    architecture: "x64",
  },
];

let symlinks = [
  {
    link_path: "screenshots",
    target_path: "D:/Minecraft/Shared/screenshots",
    link_type: "junction",
    is_directory: true,
  },
  {
    link_path: "options.txt",
    target_path: "D:/Minecraft/Shared/options.txt",
    link_type: "symlink",
    is_directory: false,
  },
];

interface MockNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: MockNode[];
  size: number;
  last_modified: number;
}

function node(base: string, name: string, children?: MockNode[], size = 0): MockNode {
  const path = base ? `${base}/${name}` : name;
  return {
    name,
    path,
    is_dir: !!children,
    children: children ?? [],
    size,
    last_modified: 1793900000,
  };
}

function tree(profileId: string) {
  const f = (dir: string, name: string, size = 2048) => node(dir, name, undefined, size);
  return {
    name: profileId,
    path: "",
    is_dir: true,
    size: 0,
    last_modified: 1793900000,
    children: [
      node("", "config", [f("config", "sodium-options.json"), f("config", "crimeclient.json")]),
      node("", "mods", [f("mods", "sodium-fabric-0.7.3.jar", 1_240_000), f("mods", "fabric-api-0.130.0.jar", 2_310_000)]),
      node("", "resourcepacks", [f("resourcepacks", "Faithful 32x.zip", 18_400_000)]),
      node("", "shaderpacks", [f("shaderpacks", "ComplementaryReimagined_r5.5.zip", 4_100_000)]),
      node("", "saves", [node("saves", "Neue Welt", [f("saves/Neue Welt", "level.dat")])]),
      node("", "screenshots", []),
      f("", "options.txt", 6_200),
      f("", "servers.dat", 900),
    ],
  };
}

export function handle(cmd: string, args: Record<string, unknown>): unknown {
  const profileId = typeof args.profileId === "string" ? args.profileId : "p-crime";
  switch (cmd) {
    case "detect_java_installations_command":
      return new Promise((r) => setTimeout(() => r(structuredClone(javaInstalls)), 400));
    case "validate_java_path_command":
      return true;
    case "get_profile_instance_path":
      return `${INSTANCE_ROOT}/${profileId}`;
    case "get_default_profile_path":
      return INSTANCE_ROOT;
    case "get_profile_symlinks":
      return structuredClone(symlinks);
    case "remove_profile_symlink": {
      symlinks = symlinks.filter((s) => s.link_path !== args.relativePath);
      return null;
    }
    case "add_profile_symlink": {
      const p = args.params as { relative_path: string; external_path: string };
      symlinks.push({
        link_path: p.relative_path,
        target_path: p.external_path,
        link_type: "symlink",
        is_directory: !/\.[a-z0-9]+$/i.test(p.relative_path),
      });
      return null;
    }
    case "get_profile_directory_structure":
      return tree(profileId);
    case "resolve_loader_version":
      return { version: "0.17.2", reason: profileId === "p-crime" ? "norisk_pack" : "profile_default" };
    default:
      return undefined;
  }
}
