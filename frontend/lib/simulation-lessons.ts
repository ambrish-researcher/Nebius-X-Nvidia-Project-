export type ExperienceId = "rubin" | "thor" | "microduck";
export type LessonStep = {
  title: string;
  caption: string;
  see: string;
  how: string;
  why: string;
  focus: string;
  terms: [string, string][];
};
export type Experience = {
  name: string;
  category: string;
  description: string;
  scale: string;
  note: string;
  facts: [string, string][];
  sources: { title: string; url: string }[];
  takeaways: string[];
  steps: LessonStep[];
};
export const EXPERIENCES: Record<ExperienceId, Experience> = {
  rubin: {
    name: "NVIDIA Vera Rubin",
    category: "THE DATA CENTER",
    description:
      "Explore a rack-scale computer. Discover how processors, networks and cooling work as one system.",
    scale: "RACK-SCALE SYSTEM",
    note: "Original schematic reconstruction. Component positions, dimensions and flow timing are illustrative; published system counts are identified separately. This is an explainer, not a hardware benchmark.",
    facts: [
      ["Rubin GPUs", "72"],
      ["Vera CPUs", "36"],
      ["System", "NVL72 rack"],
    ],
    sources: [
      {
        title: "NVIDIA · Vera Rubin NVL72",
        url: "https://www.nvidia.com/en-us/data-center/vera-rubin-nvl72/",
      },
      {
        title: "NVIDIA · Rubin architecture",
        url: "https://www.nvidia.com/en-us/data-center/technologies/rubin/",
      },
      {
        title: "NVIDIA · rack hardware and cooling guide",
        url: "https://docs.nvidia.com/dgx/dgxvr-user-guide/hardware.html",
      },
    ],
    takeaways: [
      "Vera Rubin NVL72 is a rack of cooperating computers, not a single GPU or a robot.",
      "CPUs organize work; GPUs perform parallel computation; networks move information between them.",
      "Power delivery and heat removal are part of the computing system, not optional accessories.",
    ],
    steps: [
      {
        title: "Rack overview",
        caption: "One system. Many cooperating processors.",
        focus: "rack",
        see: "The tall frame is a rack: a cabinet that holds computing equipment. The horizontal shelves are trays, which let technicians install and service groups of electronics. Our 18 illustrated compute trays each show two CPU markers and four GPU markers, accounting for the published system totals.",
        how: "A rack brings computing, connections and supporting equipment into a manageable physical structure. Shared connections let processors exchange the information needed for one large job. The arrangement here is a teaching diagram, not a service drawing.",
        why: "Some AI jobs are too large for one computer. A rack-scale design lets many processors cooperate while keeping their connections and services organized.",
        terms: [
          ["Rack", "A cabinet for mounting computer equipment."],
          [
            "Rack-scale",
            "Designed to work across the equipment in an entire rack.",
          ],
        ],
      },
      {
        title: "Exploded rack structure",
        caption: "Separate the layers. See their relationships.",
        focus: "tray",
        see: "The compute trays slide outward and separate from the structural rails. Each tray carries a simplified circuit board with processor packages, memory markers and connections. A package is the protective, connectable assembly around a silicon chip.",
        how: "Rails support the trays. Electrical connectors and network connections link removable units to the wider system. An exploded view moves parts apart to expose those relationships; a running machine does not operate with its trays floating in space.",
        why: "Modular construction makes complex equipment easier to assemble and service. Seeing the layers helps distinguish the cabinet, the board and the processors mounted on it.",
        terms: [
          [
            "Module",
            "A unit that can be installed as part of a larger system.",
          ],
          [
            "Circuit board",
            "A surface with electrical paths connecting electronic parts.",
          ],
        ],
      },
      {
        title: "Vera CPU and Rubin GPU",
        caption: "Different processors. Complementary jobs.",
        focus: "cpu",
        see: "The smaller light packages represent Vera CPUs. The green packages represent Rubin GPUs. Select either kind in the scene to inspect its role. Their shapes and placement are illustrative; the rack's published processor counts are shown below.",
        how: "A CPU, or central processing unit, coordinates software and handles varied instructions. A GPU, or graphics processing unit, contains many arithmetic workers that can apply similar operations to many numbers at once. AI systems need both coordination and large amounts of parallel arithmetic.",
        why: "Using one kind of processor for every job would be inefficient. Dividing work lets each part concentrate on operations that suit its design.",
        terms: [
          ["CPU", "A processor that coordinates programs and general tasks."],
          [
            "Parallel computation",
            "Working on several pieces of a calculation at the same time.",
          ],
        ],
      },
      {
        title: "NVLink and networking",
        caption: "Computation depends on communication.",
        focus: "network",
        see: "Green paths reveal an illustrative connection network. The side units stand for switching and networking equipment. The published platform uses NVLink 6, ConnectX-9 networking and BlueField-4 data-processing units; this model does not reproduce their wiring routes.",
        how: "NVLink is NVIDIA's interconnect for exchanging information between supported processors. A switch directs information toward its destination. Networking also connects a rack to other equipment, so scaling beyond one rack requires more than adding processors.",
        why: "Processors cannot cooperate if the needed information arrives too late. A well-designed communication system helps keep arithmetic workers supplied with data.",
        terms: [
          [
            "Interconnect",
            "A connection used to exchange information between processors.",
          ],
          [
            "Switch",
            "Equipment that directs information between connected devices.",
          ],
        ],
      },
      {
        title: "Power and liquid cooling",
        caption: "Every calculation needs energy. Every chip makes heat.",
        focus: "cooling",
        see: "The lower units represent power delivery. The vertical pipes and curved branches illustrate a cooling loop. Cold plates sit near hot processors to transfer heat into circulating coolant. These paths are explanatory, not an installation or plumbing diagram.",
        how: "Power supplies convert incoming electrical power into forms the electronics can use. Coolant carries heat away from processors toward facility equipment that removes it. Cooling and electrical capacity must be designed for the actual deployed system.",
        why: "Without reliable power, computation stops. Without heat removal, chips must slow down or shut down to avoid overheating. Infrastructure makes sustained computing possible.",
        terms: [
          ["Coolant", "A liquid that transports heat away from equipment."],
          [
            "Cold plate",
            "A heat-transfer surface placed against a hot electronic part.",
          ],
        ],
      },
      {
        title: "Example compute / data flow",
        caption: "Follow an idea through the machine.",
        focus: "flow",
        see: "Moving markers trace an illustrative request: information arrives, a CPU coordinates work, GPUs process it, and a result returns. The path and speed are chosen for learning. They are not measurements of network latency or processor performance.",
        how: "Software divides a large calculation into smaller pieces. Workers read needed information from memory, perform arithmetic and exchange intermediate results. Communication can repeat many times before the final answer is ready.",
        why: "A fast processor is useful only when it receives the right information at the right time. This flow connects the physical hardware to the software work it supports.",
        terms: [
          [
            "Memory",
            "Working storage that processors read and write during a calculation.",
          ],
          ["Latency", "The time spent waiting for an operation or response."],
        ],
      },
      {
        title: "Vera Rubin · key takeaways",
        caption: "The rack is the computer.",
        focus: "rack",
        see: "The complete system returns to view. Structural parts, compute trays, communication, power and cooling all support the same purpose: many processors working together on a large workload.",
        how: "Use orbit and zoom to revisit the cabinet. Click a part to reveal its label, or select a previous step to explore one subsystem again. Playback is an educational animation; it does not execute a workload on a Vera Rubin system.",
        why: "Understanding the entire system is more useful than memorizing a processor name. Real deployments must match software, memory needs, communication and facility services.",
        terms: [
          [
            "Workload",
            "The collection of tasks a computing system is asked to perform.",
          ],
          ["Subsystem", "A smaller cooperating part of a larger system."],
        ],
      },
    ],
  },
  thor: {
    name: "Jetson Thor T5000",
    category: "INTELLIGENCE AT THE EDGE",
    description:
      "Look inside an embedded AI module, from the idea of a transistor to CPU, GPU and memory cooperation.",
    scale: "EMBEDDED COMPUTE MODULE",
    note: "Original conceptual module and block diagram. Silicon fabrication and transistor scenes teach general principles; they are not T5000 masks, a private floorplan or a manufacturing recipe.",
    facts: [
      ["CPU", "14-core Arm Neoverse-V3AE"],
      ["GPU", "NVIDIA Blackwell"],
      ["Memory", "128 GB LPDDR5X"],
    ],
    sources: [
      {
        title: "NVIDIA · Jetson Thor specifications",
        url: "https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/",
      },
      {
        title: "NVIDIA · Jetson Linux documentation",
        url: "https://docs.nvidia.com/jetson/",
      },
    ],
    takeaways: [
      "A T5000 is an embedded module for local computing, not a rack-scale Vera Rubin system.",
      "The CPU handles general coordination; the Blackwell GPU accelerates suitable parallel and AI work.",
      "The silicon construction scene is conceptual. Exact transistor placement and fabrication details are not reproduced.",
    ],
    steps: [
      {
        title: "T5000 module overview",
        caption: "A compact computer for local intelligence.",
        focus: "module",
        see: "A circuit board carries a processor package, memory packages, power components and connectors. The package is shown open to make the logical blocks visible. This original model shows their roles, not the module's exact board layout.",
        how: "An embedded module is intended to become part of another machine. The processor and working memory live on the module; a carrier board supplies connections to devices such as cameras, storage and networks.",
        why: "Local computing can process sensor information close to where it is collected. Engineers still need to design the surrounding power, cooling, connections and software for their machine.",
        terms: [
          [
            "Embedded",
            "Built into another device rather than used as a separate desktop computer.",
          ],
          [
            "Carrier board",
            "A board that connects a compute module to the rest of a machine.",
          ],
        ],
      },
      {
        title: "How silicon chips are constructed",
        caption: "A general principle, not a private recipe.",
        focus: "silicon",
        see: "A patterned wafer and separated layers illustrate the idea of chip fabrication. A wafer is a thin slice of semiconductor material. Patterns define tiny devices and the electrical connections between them. The visible features are enlarged far beyond real scale.",
        how: "Manufacturing repeats many controlled steps to build devices and connections in layers. Finished chips are separated, connected to a package and tested. This overview intentionally omits process recipes, mask layouts and manufacturer-specific details.",
        why: "A chip is a carefully built electrical structure, not simply a solid piece of metal. This general picture makes the following transistor and logic explanation easier to understand.",
        terms: [
          [
            "Semiconductor",
            "A material whose electrical behavior can be controlled to build electronic devices.",
          ],
          [
            "Wafer",
            "A thin material disc used as the starting surface for making many chips.",
          ],
        ],
      },
      {
        title: "Transistors and logic",
        caption: "Tiny switches become useful decisions.",
        focus: "logic",
        see: "The enlarged blocks represent switches and simple connections. A highlighted path turns on and off as playback advances. This is a conceptual logic diagram; the shapes are not the physical transistors inside a T5000.",
        how: "A transistor controls electrical current. Groups of transistors form logic gates, which combine signals according to rules. Larger combinations can add numbers, remember small pieces of information and decide which instruction happens next.",
        why: "Large computing systems grow from small, repeatable electrical operations. Logic blocks turn individual switching actions into programmable behavior.",
        terms: [
          [
            "Transistor",
            "An electronic device that controls current, often used as a switch.",
          ],
          [
            "Logic gate",
            "A small circuit that combines signals according to a rule.",
          ],
        ],
      },
      {
        title: "CPU · the coordinator",
        caption: "Keep the program and the system organized.",
        focus: "cpu",
        see: "Fourteen highlighted blocks symbolize the documented CPU cores. A core is a worker inside a processor that executes instructions. Their arrangement is a teaching diagram, not an image of the real silicon.",
        how: "The CPU runs general software, organizes tasks, handles communication and prepares work for accelerators. Caches are small nearby stores that reduce how often a core must wait for information from larger memory.",
        why: "AI arithmetic is only one part of a working device. Programs also need to read inputs, manage resources, handle errors and decide what happens next.",
        terms: [
          ["Core", "A processing worker that executes program instructions."],
          [
            "Cache",
            "A small, fast store for information a processor is likely to use soon.",
          ],
        ],
      },
      {
        title: "Blackwell GPU · parallel work",
        caption: "Many similar calculations, together.",
        focus: "gpu",
        see: "A field of highlighted tiles represents groups of GPU computing resources. NVIDIA documents a Blackwell GPU for the T5000. The tile count and positions in this view are illustrative and do not represent individual physical cores.",
        how: "Neural networks repeatedly combine arrays of numbers. A GPU can perform many suitable operations in parallel. Specialized arithmetic resources accelerate supported operations, while software decides how to divide and schedule the work.",
        why: "Parallel work is useful when a job contains many similar calculations. It complements CPU coordination rather than replacing every CPU responsibility.",
        terms: [
          [
            "GPU",
            "A processor designed to carry out large amounts of suitable parallel work.",
          ],
          [
            "Neural network",
            "A calculation model that combines learned numerical parameters to transform inputs into outputs.",
          ],
        ],
      },
      {
        title: "Memory and CPU–GPU data movement",
        caption: "Working together means sharing information.",
        focus: "memory",
        see: "The memory packages light up and paths connect them to the CPU and GPU blocks. The T5000 is documented with 128 GB of LPDDR5X memory. Package placement in this model is illustrative.",
        how: "Programs store inputs, model parameters and intermediate results in memory. Processors need mechanisms to access and coordinate that information. Bandwidth describes how much information can move in a given time; it is different from storage capacity.",
        why: "A model must fit available memory, and its workers must receive data quickly enough. More arithmetic hardware alone cannot solve every memory bottleneck.",
        terms: [
          ["Capacity", "The amount of information a memory can hold."],
          [
            "Bandwidth",
            "How much information a connection can transfer per unit of time.",
          ],
        ],
      },
      {
        title: "Example sensor / AI workload",
        caption: "From a camera observation to an informed response.",
        focus: "flow",
        see: "Markers illustrate sensor information entering the module, passing through software coordination and AI processing, then becoming an output. No camera recording is used and no live inference is being claimed.",
        how: "A possible application captures an image, prepares its numbers, runs a supported neural network and interprets the result. The machine's control software then decides what to do. Real-time motor protection still needs an appropriate control and safety design.",
        why: "This example connects hardware roles to a recognizable task. It also separates understanding an observation from safely commanding a physical machine.",
        terms: [
          [
            "Inference",
            "Using an already trained model to produce an output from new input.",
          ],
          [
            "Sensor",
            "A device that measures something about the surrounding world or the machine itself.",
          ],
        ],
      },
      {
        title: "T5000 · key takeaways",
        caption: "A module, a software stack and a surrounding machine.",
        focus: "module",
        see: "The module returns to its overview. CPU, GPU, memory and interfaces belong to one compact computing platform, but their jobs remain distinct.",
        how: "Revisit any step, orbit the board or inspect a labeled part. The scene is a local educational animation. It neither fabricates a chip nor measures the performance of a Jetson module.",
        why: "Choosing embedded hardware means considering software support, memory, connections, power and cooling together. A product name alone is not a complete system design.",
        terms: [
          [
            "Interface",
            "A defined way for two parts to connect or exchange information.",
          ],
          [
            "Software stack",
            "The layers of software that work together to operate hardware and run applications.",
          ],
        ],
      },
    ],
  },
  microduck: {
    name: "Microduck",
    category: "A SMALL ROBOT, EXPLAINED",
    description:
      "Explore the mechanics, sensing and onboard computing of Pollen Robotics and Hugging Face's small biped.",
    scale: "BIPED ROBOT",
    note: "Original procedural interpretation, not manufacturer CAD. Internal placement and motion are illustrative. The walking sequence is kinematic animation, not a physics simulation, trained policy or balance validation.",
    facts: [
      ["Movement", "15 motors"],
      ["Compute", "Rockchip RK3566"],
      ["Sensors", "Camera · depth · 2 IMUs"],
    ],
    sources: [
      {
        title: "Pollen Robotics · Microduck specifications",
        url: "https://store.pollen-robotics.com/products/microduck",
      },
      {
        title: "Pollen Robotics · identity and provenance",
        url: "https://pollen-robotics.com/microduck/press-kit/",
      },
      {
        title: "Rockchip · RK3566 architecture",
        url: "https://www.rock-chips.com/a/en/products/RK35_Series/2021/0113/1274.html",
      },
    ],
    takeaways: [
      "Microduck uses Rockchip-based onboard computing. This model does not put Jetson Thor or Vera Rubin inside the stock robot.",
      "Sensing, deciding and moving are different jobs connected by a repeated control loop.",
      "A visible walking animation demonstrates joint relationships; it does not prove physical balance or a working real-world policy.",
    ],
    steps: [
      {
        title: "Complete robot overview",
        caption: "A whole machine in a small body.",
        focus: "body",
        see: "Meet an original interpretation of Microduck: a head with a beak, a compact body and two articulated legs. Pollen Robotics documents 15 motors and Rockchip-based computing. This model does not attempt to reproduce private mechanical or electronic design files.",
        how: "The frame supports the electronics and connects moving parts. Motors turn joints, sensors measure the world, and a computer coordinates actions. The battery powers both movement and electronics.",
        why: "A robot combines several kinds of engineering. Understanding their relationships is more useful than thinking of the robot as just a computer with legs.",
        terms: [
          ["Biped", "A machine or animal that moves on two legs."],
          [
            "Actuated",
            "Moved by a motor or another controllable source of force.",
          ],
        ],
      },
      {
        title: "Exploded mechanical assembly",
        caption: "Reveal the structure beneath the shell.",
        focus: "assembly",
        see: "The shell, head, legs, battery and electronics separate slightly so their relationships are visible. This exploded view is a teaching technique. Real hardware must be securely assembled to carry loads and make reliable connections.",
        how: "Structural parts support weight. Bearings guide rotation and reduce friction. Fasteners hold parts together. Wiring carries power and information to motors and sensors; the illustrated routes are not an assembly instruction for a real Microduck.",
        why: "Mechanical packaging must leave space for movement, wiring and maintenance. An exploded view helps reveal why parts cannot all occupy the same space.",
        terms: [
          [
            "Bearing",
            "A part that supports controlled movement between surfaces.",
          ],
          [
            "Fastener",
            "A screw, bolt or similar item used to hold parts together.",
          ],
        ],
      },
      {
        title: "Motors, joints and movement",
        caption: "A joint turns. A linked structure moves.",
        focus: "motor",
        see: "Joint housings highlight around the legs, neck and beak. The scene shows a simplified arrangement for the published 15-motor concept. Some groups articulate together so you can see how turning one joint changes the links below it.",
        how: "A motor converts electrical energy into mechanical motion. A controller commands a target, and feedback helps compare the actual movement with that target. A leg's links form a chain, so their positions depend on several joints together.",
        why: "Coordinated motion needs more than switching every motor on. Timing, position limits, loads and feedback matter when a real robot supports its own weight.",
        terms: [
          [
            "Joint",
            "A connection that allows movement between mechanical parts.",
          ],
          [
            "Feedback",
            "A measurement used to compare what happened with what was requested.",
          ],
        ],
      },
      {
        title: "Camera, LiDAR and motion sensors",
        caption: "Different measurements answer different questions.",
        focus: "sensor",
        see: "The front camera and conceptual depth-sensor housing highlight. Rays illustrate depth measurements; small internal blocks represent the two documented IMUs. The manufacturer's compact 8×8 time-of-flight sensor is not a spinning laser scanner.",
        how: "A camera measures an image. Time-of-flight depth sensing estimates distance from light travel time. An IMU, or inertial measurement unit, measures motion such as acceleration and rotation. Software must interpret these different signals together.",
        why: "An image alone does not directly tell a robot its tilt or every distance. Complementary sensors supply different pieces of the picture. The rays here are visual explanations, not processed sensor readings.",
        terms: [
          ["IMU", "A sensor unit that measures acceleration and rotation."],
          [
            "Time of flight",
            "A distance-measurement method based on how long a signal takes to travel.",
          ],
        ],
      },
      {
        title: "Rockchip RK3566 processor",
        caption: "The computing platform actually belongs to the robot.",
        focus: "processor",
        see: "The body shell opens to expose a conceptual electronics board labeled RK3566. Pollen Robotics identifies the Rockchip RK3566 with an AI accelerator. The stock robot is not shown with a Jetson Thor module or a data-center rack inside it.",
        how: "A system-on-chip integrates several computing functions into one chip. It communicates with memory and other electronics to run software and handle information. This board's position and shapes are illustrative rather than a manufacturer schematic.",
        why: "Keeping hardware identities separate prevents a misleading mental model. Small onboard computers and rack-scale systems serve very different power, space and workload needs.",
        terms: [
          [
            "System-on-chip",
            "A chip that combines multiple computing functions.",
          ],
          [
            "Onboard",
            "Located on the robot itself, rather than on a remote computer.",
          ],
        ],
      },
      {
        title: "CPU, Mali GPU and NPU roles",
        caption: "Three kinds of processing, three different jobs.",
        focus: "compute",
        see: "The conceptual RK3566 block diagram separates CPU, Mali graphics and neural-processing resources. Rockchip documents these processor blocks. Their visible arrangement is not an exact chip floorplan or a claim that all robot software uses every block.",
        how: "The CPU runs general software. A GPU handles supported graphics and suitable parallel work. An NPU is a neural-processing unit designed for supported neural-network operations. Actual use depends on the model, drivers and software; hardware presence does not guarantee acceleration.",
        why: "Understanding each role helps distinguish a processor's capabilities from what an application actually runs. The product's AI-accelerator statement does not establish the placement of every internal device.",
        terms: [
          [
            "NPU",
            "A processor designed for supported neural-network calculations.",
          ],
          [
            "Driver",
            "Software that lets other software control a hardware device.",
          ],
        ],
      },
      {
        title: "Policy-to-motor control flow",
        caption: "Observe. Decide. Command. Measure again.",
        focus: "flow",
        see: "Moving markers connect the sensor region, onboard computer and joint actuators. They illustrate a repeated control loop. No live sensor processing, trained walking policy or real motor communication is running in this browser scene.",
        how: "A policy is a rule or learned model for choosing actions from observations. Control software translates those actions into motor targets. New measurements then reveal how the machine actually responded, allowing the next command to be adjusted.",
        why: "A command is not the same as a successful action. A real robot must repeatedly measure its state and respect electrical and mechanical limits.",
        terms: [
          [
            "Policy",
            "A rule or learned model for choosing actions from observations.",
          ],
          [
            "Control loop",
            "A repeated process of measuring, commanding and checking a system.",
          ],
        ],
      },
      {
        title: "Walking demonstration and summary",
        caption: "See the relationships. Understand the limits.",
        focus: "walk",
        see: "Alternating hip, knee and ankle rotations create an illustrative walking cycle. Use Play and Pause to start or stop it, change playback speed, and orbit to inspect the leg chains. This is real-time geometry rendered in your browser.",
        how: "The animation prescribes joint angles. It does not calculate ground forces, friction, contact, motor torque or a learned balancing response. A real walking controller must handle those physical effects; matching a visible pose does not prove that a robot will stand or walk.",
        why: "A useful educational model makes its limits clear. You can learn how connected joints move without mistaking the demonstration for a validated physical robot simulation.",
        terms: [
          [
            "Kinematics",
            "The description of positions and movement without calculating the forces causing them.",
          ],
          [
            "Dynamics",
            "The study of movement together with forces and physical interactions.",
          ],
        ],
      },
    ],
  },
};

export const EXPERIENCE_IDS = Object.keys(EXPERIENCES) as ExperienceId[];
export function resolveExperience(prompt: string): ExperienceId | null {
  const q = prompt.toLowerCase();
  if (/\b(vera|rubin|nvl72)\b/.test(q)) return "rubin";
  if (/\b(jetson\s+thor|thor|t5000)\b/.test(q)) return "thor";
  if (/\bmicro[ -]?duck\b/.test(q)) return "microduck";
  return null;
}
