import type { ExperienceId, LessonStep } from "./simulation-lessons";
// Student explanations describe relationships in the teaching model. Geometry
// and arrangement are deliberately kept separate from public product facts.
export const STAGE_NOTES: Partial<
  Record<ExperienceId, Record<string, Partial<LessonStep>>>
> = {
  rubin: {
    foundation: {
      terms: [
        [
          "Load",
          "The force a structure must support, including the weight of its equipment.",
        ],
        ["Mounting point", "A fixed place where one part connects to another."],
      ],
    },
    rack: {
      why: "A rigid frame keeps heavy equipment aligned and provides repeatable attachment points. Notice how the rails connect to the base: the trays will rely on these supports rather than float independently.",
      terms: [
        ["Rail", "A structural guide that supports an installed tray."],
        [
          "Cross-member",
          "A piece joining two supports to keep a frame aligned.",
        ],
      ],
    },
    cpu: {
      how: "A CPU follows program instructions, organizes memory access and prepares jobs for other processors. The light package markers sit on the trays that already exist. Their connections let CPU coordination become useful GPU work; they are not independent computers floating outside the system.",
    },
    gpu: {
      how: "A GPU divides suitable arithmetic among many workers. For an AI task, those workers can apply related operations to many numbers together. CPUs still organize the program, memory supplies the numbers, and the connection fabric exchanges information. Package outlines and locations here are schematic.",
      why: "A large model may need more work and memory than one processor can supply. The rack connects many GPUs so they can cooperate on parts of the same job.",
      terms: [
        [
          "GPU",
          "A processor designed to perform many suitable calculations in parallel.",
        ],
        ["Parallel", "Several pieces of work happening at the same time."],
      ],
    },
    network: {
      how: "NVLink provides high-bandwidth processor communication within the platform. Switches direct exchanges among connected processors. Separate networking links the rack to storage, management and other machines. The routes in this scene identify those roles without claiming to reproduce private cable routing.",
    },
    cooling: {
      how: "Electronics turn some electrical energy into heat. Cold plates conduct heat into a circulating liquid; a supply manifold distributes cooler liquid and a return carries warmed liquid away. Heat is ultimately removed by equipment beyond this schematic. The compute packages stay seated throughout.",
      terms: [
        [
          "Cold plate",
          "A component that transfers heat from electronics to a cooling liquid.",
        ],
        [
          "Manifold",
          "A shared passage distributing fluid to several branches.",
        ],
      ],
    },
  },
  thor: {
    devices: {
      how: "A semiconductor process changes selected regions of a wafer and builds structures on its surface. Devices control current, while insulating material prevents unwanted electrical connections. The enlarged layers show these different jobs, not their real thicknesses or an NVIDIA process recipe.",
      why: "A useful circuit needs controlled current paths. Devices alone would not form a reliable computer if nearby connections could accidentally conduct into each other.",
      terms: [
        [
          "Device",
          "A small electronic structure that performs a function, such as controlling current.",
        ],
        ["Insulator", "A material that strongly resists electrical current."],
      ],
    },
    metal: {
      how: "Conducting paths connect devices into larger circuits. Real chips use many carefully patterned wiring layers separated by insulation. The single visible connection layer simplifies that idea. It remains attached to the substrate and device layers already introduced.",
      why: "Computing requires devices to exchange signals. Wiring connects individual switches into logic, memory and larger systems.",
      terms: [
        [
          "Conductor",
          "A material through which electrical charge can move relatively easily.",
        ],
        [
          "Interconnect",
          "An electrical connection that carries signals between parts of a circuit.",
        ],
      ],
    },
    module: {
      terms: [
        [
          "Circuit board",
          "A supporting sheet containing electrical paths between components.",
        ],
        [
          "Carrier board",
          "A board connecting a compute module to the rest of a machine.",
        ],
      ],
    },
    silicon: {
      why: "A tiny silicon chip needs protection, electrical contacts and a manageable mounting surface. Packaging bridges the scale between microscopic devices and a board that can be installed in a machine.",
      terms: [
        ["Package", "The protective and connecting structure around a chip."],
        [
          "Substrate",
          "A supporting base that can also carry electrical connections.",
        ],
      ],
    },
    power: {
      why: "Computing circuits need stable electrical supplies. Poorly controlled power can interrupt operation or damage electronics, so power delivery is part of the module's design rather than a separate afterthought.",
      terms: [
        [
          "Regulator",
          "A circuit that maintains an electrical supply near a required value.",
        ],
        [
          "Voltage",
          "The electrical potential difference that can drive current through a circuit.",
        ],
      ],
    },
    connectors: {
      how: "A module's electrical contacts mate with connections on a carrier board. Those connections carry power and signals to the surrounding machine. The visible contact pattern teaches this relationship; it does not reproduce the real module's connector layout.",
      why: "A processor needs a route to sensor inputs, storage and other devices. Connectors let the module become part of a larger system rather than remain an isolated board.",
      terms: [
        [
          "Interface",
          "An agreed connection through which two parts exchange power or information.",
        ],
        [
          "Carrier board",
          "The board that connects a module to other parts of a machine.",
        ],
      ],
    },
    cover: {
      how: "A package cover protects underlying parts and can participate in transferring heat. The model uses an open educational cutaway so CPU and GPU roles stay visible. The opening is a viewing device, not a claim about the real T5000 cover.",
      why: "An assembled computer needs protection and heat removal as well as computing resources. A cutaway lets you study their relationship while every modeled part remains attached.",
      terms: [
        [
          "Cutaway",
          "A teaching view with part of a covering omitted to reveal what is inside.",
        ],
        [
          "Heat spreader",
          "A structure that distributes heat over a larger area for removal.",
        ],
      ],
    },
  },
  microduck: {
    frame: {
      how: "Side frames and cross-members form a load path from the body to the hip mounts. Openings leave room for the battery, board and wiring. These original profiles explain mechanical support; their dimensions are not manufacturer CAD.",
      terms: [
        [
          "Frame",
          "The supporting structure holding a machine's parts together.",
        ],
        [
          "Load path",
          "The connected route through which forces pass through a structure.",
        ],
      ],
    },
    motor: {
      how: "The pelvis connects the two hip locations to the body. A motor's housing stays mounted while its output turns a connected joint. Bearings support that turning movement. The actuator housings and brackets are illustrative rather than exact motor internals.",
      why: "Both legs must transfer their forces into the same body structure. A connected pelvis makes that relationship visible before the leg chains appear.",
      terms: [
        ["Pelvis", "The structural region joining a robot's body to its legs."],
        [
          "Actuator",
          "A device that converts a command and energy into physical movement.",
        ],
      ],
    },
    head: {
      terms: [
        ["Joint", "A connection allowing controlled movement between parts."],
        [
          "Orientation",
          "The direction in which an object is facing or tilted.",
        ],
      ],
    },
    body: {
      how: "The covers attach to the frame around the electronics. Their openings, clearances and removable panels illustrate access and packaging. Inspection can make the cover translucent, revealing the still-attached controller rather than pulling it outside the robot.",
      why: "A body cover can protect parts, organize access and prevent loose wiring from interfering with movement. It must leave enough clearance for the neck and legs to move.",
      terms: [
        ["Enclosure", "A covering around a machine's internal components."],
        [
          "Clearance",
          "Space left between parts so they can fit or move without colliding.",
        ],
      ],
    },
  },
};
