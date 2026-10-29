export const hardwareFamilies = [
  {
    id: "geforce",
    name: "GeForce RTX",
    kind: "Consumer GPU",
    products: "RTX 30 / 40 / 50 families",
    purpose:
      "Graphics, local AI experiments, and development workstations. Verify VRAM, driver, CUDA, and application support per product.",
    tradeoff:
      "A desktop graphics card is not an onboard robotics module. Cooling, host power, and packaging matter.",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/",
  },
  {
    id: "rtx-pro",
    name: "RTX PRO",
    kind: "Professional GPU",
    products: "RTX professional / RTX PRO Blackwell",
    purpose:
      "Professional graphics, visualization, and supported AI workflows. Product memory capacity and professional software support vary.",
    tradeoff:
      "Professional positioning does not automatically guarantee a robotics deadline or every Isaac framework requirement.",
    source:
      "https://www.nvidia.com/en-us/design-visualization/desktop-graphics/",
  },
  {
    id: "jetson",
    name: "Jetson",
    kind: "Edge module",
    products: "Jetson Orin / Jetson Thor",
    purpose:
      "Local robot perception and AI inference under edge power, thermal, and latency constraints. Check the exact module and JetPack release.",
    tradeoff:
      "An edge module includes an embedded platform; it is not interchangeable with a workstation GPU card.",
    source:
      "https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/",
  },
  {
    id: "datacenter",
    name: "Data-center AI",
    kind: "Accelerator / host system",
    products: "L4 / L40S / A100 / H100 / H200",
    purpose:
      "Cloud inference, training, visualization, and simulation workloads where a supported host and software stack are available.",
    tradeoff:
      "These products have different architectures, memory systems, power envelopes, and intended deployments. Names alone are not compatibility evidence.",
    source: "https://www.nvidia.com/en-us/data-center/",
  },
  {
    id: "blackwell",
    name: "Blackwell",
    kind: "GPU / superchip / system",
    products: "B200 / GB200 / GB300",
    purpose:
      "Large AI workloads across Blackwell GPU and CPU–GPU system configurations. Distinguish the accelerator from a superchip and a deployed server.",
    tradeoff:
      "A GB-series system is not a consumer graphics card or a drop-in robot brain. Network and local safety constraints remain.",
    source:
      "https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/",
  },
  {
    id: "rubin",
    name: "Vera Rubin",
    kind: "Data-center architecture",
    products: "Rubin GPU / Vera CPU / Vera Rubin NVL72",
    purpose:
      "Explore CPU, GPU, memory, NVLink, and scale-out networking roles in large AI infrastructure and fleet-level research.",
    tradeoff:
      "NVL72 describes a rack-scale system, not a standalone consumer GPU. Availability and exact specifications require current manufacturer verification.",
    source: "https://www.nvidia.com/en-us/data-center/technologies/rubin/",
  },
] as const;

/** Values read from manufacturer pages on this date; never application benchmarks. */
export const documentedExamples = [
  {
    id: "rtx5090",
    family: "geforce",
    name: "GeForce RTX 5090",
    architecture: "Blackwell",
    memory: "32 GB GDDR7",
    bandwidth: "Not recorded in this catalog",
    power: "575 W total graphics power; NVIDIA reference specification",
    scope: "Desktop graphics card; board partner designs can differ.",
    source:
      "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/",
  },
  {
    id: "agx-orin64",
    family: "jetson",
    name: "Jetson AGX Orin 64GB",
    architecture: "Ampere",
    memory: "64 GB LPDDR5",
    bandwidth: "204.8 GB/s",
    power: "15–60 W configurable module modes",
    scope: "Embedded module; carrier, cooling, and sensors add system power.",
    source:
      "https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/",
  },
  {
    id: "thor-t5000",
    family: "jetson",
    name: "Jetson T5000",
    architecture: "Blackwell",
    memory: "128 GB LPDDR5X",
    bandwidth: "273 GB/s",
    power: "40–130 W configurable module modes",
    scope:
      "Embedded module, not a PCIe workstation card. JetPack and model compatibility require release-specific checks.",
    source:
      "https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/",
  },
  {
    id: "h100-sxm",
    family: "datacenter",
    name: "H100 SXM",
    architecture: "Hopper",
    memory: "80 GB GPU memory",
    bandwidth: "3.35 TB/s",
    power: "Up to 700 W configurable GPU TDP",
    scope:
      "SXM accelerator requiring a supported host; excludes total host power. Do not substitute H100 NVL specifications.",
    source: "https://www.nvidia.com/en-us/data-center/h100/",
  },
  {
    id: "vera-rubin-nvl72",
    family: "rubin",
    name: "Vera Rubin NVL72",
    architecture: "Rubin GPU + Vera CPU + NVLink 6",
    memory: "Not recorded in this catalog",
    bandwidth: "Not recorded in this catalog",
    power: "Site power and cooling study required; no value recorded",
    scope:
      "Rack-scale platform: 72 Rubin GPUs and 36 Vera CPUs, according to NVIDIA. No local access or performance measurement.",
    source: "https://www.nvidia.com/en-us/data-center/technologies/rubin/",
  },
] as const;
export const hardwareCheckedAt = "2026-10-29";
export const computeConcepts = [
  {
    id: "parallel",
    name: "Parallel work",
    explanation:
      "A GPU runs many related operations across large batches of data. Independent image pixels and matrix operations expose parallel work. A small sequential motor-control loop may gain little, and still needs predictable scheduling.",
  },
  {
    id: "memory",
    name: "Memory + bandwidth",
    explanation:
      "Capacity determines whether weights, activations, sensor buffers, and runtime state fit. Bandwidth is how quickly data can move. Large memory alone does not prove low latency; shared edge memory also serves the CPU and operating system.",
  },
  {
    id: "precision",
    name: "Compute precision",
    explanation:
      "FP32, FP16, BF16, FP8, and FP4 use different numeric representations. Lower precision may improve throughput or reduce memory, but requires supported hardware, kernels, model conversion, and accuracy validation. Do not compare unlike dense and sparse peak figures.",
  },
  {
    id: "deployment",
    name: "From model to robot",
    explanation:
      "CUDA exposes GPU computation. TensorRT optimizes supported inference graphs. JetPack supplies the Jetson software platform. Match the exact GPU architecture, driver, OS, framework release, model operators, and thermal envelope, then measure end-to-end sensor-to-action latency.",
  },
] as const;
