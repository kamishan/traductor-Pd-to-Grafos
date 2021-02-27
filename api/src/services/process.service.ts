import { getManager, getRepository } from "typeorm";
import { Process } from "../models/entities/Process";
import { Singleton } from "typescript-ioc";
import { IProcess } from "../models/interfaces/IProcess";
import { Response } from "express";
import { PermissiveRelation } from "../models/entities/PermissiveRelation";
import { SynchronousRelation } from "../models/entities/SynchronousRelation";
import { IElement } from "../models/interfaces/IElement";

@Singleton 
export class ProcessService{
    
    createProcess(process: IProcess): Promise<Process>{
        process.created_date = new Date
        return getManager().getRepository(Process).save(process);
    }

    getAllProcess(): Promise<Process[]>{        
        return getManager().getRepository(Process).find()
    }

    getByName(name: string){        
        return getManager().getRepository(Process).find({
            where:{
                name: name
            }
        })
    }

    async getGraphData(id: number){

        const nodes: Array<IElement> = [];
        const edges: Array<Edge> = [];

        const permissive = await getRepository(PermissiveRelation).createQueryBuilder("permissive")
        .where("permissive.process = :process")
        .leftJoinAndSelect("permissive.actuator", "actuator")
        .leftJoinAndSelect("permissive.controlled", "controlled")
        .setParameter('process', id)
        .getMany();

        const synchronous = await getRepository(SynchronousRelation).createQueryBuilder("synchronous")
        .where("synchronous.process = :process")
        .leftJoinAndSelect("synchronous.initial_controlled", "initial_controlled")
        .leftJoinAndSelect("synchronous.end_controlled", "end_controlled")
        .setParameter('process', id)
        .getMany();

        permissive.forEach(element => {
            nodes.push(element.actuator);
            nodes.push(element.controlled);
            edges.push({
                id: element.actuator.id.toString()+element.controlled.id.toString(),
                source: element.actuator.id,
                target: element.controlled.id,
                style: {
                    'line-style': 'solid',
                    'target-arrow-shape': 'triangle'
                }
            })
        });

        synchronous.forEach(element => {
            nodes.push(element.initial_controlled);
            nodes.push(element.end_controlled);
            edges.push({
                id: element.initial_controlled.id.toString()+element.end_controlled.id.toString(),
                source: element.initial_controlled.id,
                target: element.end_controlled.id,
                style: {
                    'line-style': 'dotted'
                }
            })
        });

        const nodesData = this.deleteDuplicateNodes(nodes);
        const edgesData = this.deleteDuplicateEdges(edges);

        return {nodes: nodesData, edges: edgesData};
    }

    async getPetriData(id: number){

        const nodes: Array<IElement> = [];
        const edges: Array<Edge> = [];

        const permissive = await getRepository(PermissiveRelation).createQueryBuilder("permissive")
        .where("permissive.process = :process")
        .leftJoinAndSelect("permissive.actuator", "actuator")
        .leftJoinAndSelect("actuator.detail", "actuator_detail")
        .leftJoinAndSelect("permissive.controlled", "controlled")
        .leftJoinAndSelect("controlled.detail", "controlled_detail")
        .setParameter('process', id)
        .getMany();

        const synchronous = await getRepository(SynchronousRelation).createQueryBuilder("synchronous")
        .where("synchronous.process = :process")
        .leftJoinAndSelect("synchronous.initial_controlled", "initial_controlled")
        .leftJoinAndSelect("initial_controlled.detail", "initial_detail")
        .leftJoinAndSelect("synchronous.end_controlled", "end_controlled")
        .leftJoinAndSelect("end_controlled.detail", "end_detail")
        .setParameter('process', id)
        .getMany();

        permissive.forEach(element => {
            nodes.push(element.actuator);
            nodes.push(element.controlled);
        });

        synchronous.forEach(element => {
            nodes.push(element.initial_controlled);
            nodes.push(element.end_controlled);
        });

        const {nodesData, detailNodes} = this.deleteDuplicateNodesDetail(nodes);

        return synchronous;
    }

    updateProcess(id: number, process: IProcess){
        return getManager().getRepository(Process).update({ id: id }, process);
    }
    
    async deleteProcess(id: number, res: Response){
        try {
            const data = await getManager().getRepository(Process).delete({ id: id });
            return res.status(200).json({ message: 'Proceso eliminado' });
        } catch (error) {
            return res.status(500).json({ message: 'Ha ocurrido un error', data: error });
        }
    }

    deleteDuplicateNodes(nodes: Array<IElement>) {
        const graphData: Array<Data> = [];
        const noDuplicates: Array<IElement> = [];
        nodes.forEach((element: IElement) => {
            const aux = noDuplicates.filter((x: IElement) => x.id === element.id);
            if (aux.length === 0) {
                noDuplicates.push(element);
                graphData.push({
                    data: { id: element.id, name: element.name }
                });
            }
        });
        return graphData;
    }

    deleteDuplicateNodesDetail(nodes: Array<IElement>) {
        const nodesData: Array<Data> = [];
        const noDuplicates: Array<IElement> = [];
        nodes.forEach((element: IElement) => {
            const aux = noDuplicates.filter((x: IElement) => x.id === element.id);
            if (aux.length === 0) {
                noDuplicates.push(element);
                nodesData.push({
                    data: { id: element.id, name: element.name }
                });
            }
        });
        return {nodesData, detailNodes: noDuplicates};
    }

    deleteDuplicateEdges(edges: Array<Edge>) {
        const noDuplicates: Array<Edge> = [];
        const edgeData: Array<DataEdge> = [];
        edges.forEach(element => {
            const aux = noDuplicates.filter((x: Edge) => 
                ((x.source === element.source && x.target === element.target) || (x.source === element.target && x.target === element.source))
            )
            if (aux.length === 0) {
                noDuplicates.push(element);
                edgeData.push({data: element, style: element.style});
            }
        });

        return edgeData;
    }

}

interface Edge {
    id: string,
    source: number;
    target: number;
    style: {
        'line-style': string;
        'target-arrow-shape'?: string;
    };
}

interface DataEdge {
    data: {
        id: string,
        source: number;
        target: number;
    },
    style: {
        'line-style': string;
    };
}

interface Data {
    data: {
        id: number | undefined;
        name: string;
    }
}