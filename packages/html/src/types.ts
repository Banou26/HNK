/* eslint-disable no-unused-vars */
import { Observable, OperatorFunction, Operator } from 'rxjs'

export enum PlaceholderType {
  TEXT = 'text',
  COMMENT = 'comment',
  START_TAG = 'startTag',
  END_TAG = 'endTag',
  ATTRIBUTE = 'attribute'
}

export enum PlaceholderMetadataType {
  COMMENT = 'comment',
  TEXT = 'text',
  ELEMENT = 'element',
  ATTRIBUTE = 'attribute'
}

export enum AttributeType {
  BARE = 'bare',
  QUOTED = 'quoted'
}

export interface PlaceholderMetadata<T = PlaceholderMetadataType> {
  placeholderType: PlaceholderType
  type: T
  ids: number[]
  path: string[]
}

export interface ElementMetadata extends PlaceholderMetadata<PlaceholderMetadataType.ELEMENT> {
  tagName: string
  dependents?: AttributeMetadata[]
}

export interface AttributeMetadata extends PlaceholderMetadata<PlaceholderMetadataType.ATTRIBUTE> {
  attributeType: AttributeType
  name: string
  value: string
  dependents?: AttributeMetadata[]
}

export interface TextMetadata extends PlaceholderMetadata<PlaceholderMetadataType.TEXT> {
  data: string
}

export interface CommentMetadata extends PlaceholderMetadata<PlaceholderMetadataType.COMMENT> {
  data: string
}

export interface ArrayFragment extends Array<ArrayFragment|Node> {}

export interface Placeholder<T = PlaceholderMetadataType> extends OperatorFunction<any, any> {
  metadata: PlaceholderMetadata<T>
  arrayFragment: ArrayFragment
}
