/**
 * ItemDTO
 *
 * Plain data object returned by use cases.
 * Never exposes a domain entity directly across layer boundaries.
 *
 * Layer: Application → DTOs
 * Imports: application / domain primitives only
 */

export class ItemDTO {
  /**
   * @param {object} props
   * @param {string}  props.id
   * @param {string}  props.name
   * @param {string}  props.description
   * @param {boolean} props.completed
   * @param {string}  props.status       "pending" | "completed"
   * @param {string}  props.createdAt    ISO-8601
   * @param {string}  props.updatedAt    ISO-8601
   */
  constructor({ id, name, description, completed, status, createdAt, updatedAt }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.completed = completed;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    Object.freeze(this);
  }
}
